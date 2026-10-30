const express = require('express')
const { conectar } = require('../db')
const verificarToken = require('../middleware/auth')
const { ROLES, permitirRoles } = require('../middleware/roles')
const { agruparPor, generarNumero, registrarMovimientoStock } = require('../utils/funciones')
const { conMensajeDeError } = require('../middleware/errores')

const router = express.Router()
router.use(verificarToken)

router.get('/', permitirRoles(ROLES.ADMIN, ROLES.OPERARIO), conMensajeDeError('Error al obtener lotes de producción', async (req, res) => {
  const pool = await conectar()

  const resLotes = await pool.request().query(`
    SELECT
      l.id_lote, l.nro_lote, l.cantidad_producida,
      CONVERT(VARCHAR(10), l.fecha_elaboracion, 23) AS fecha_elaboracion,
      CONVERT(VARCHAR(10), l.fecha_vencimiento, 23) AS fecha_vencimiento,
      l.estado, l.observaciones,
      l.id_producto, p.nombre AS producto,
      l.id_usuario,
      u.nombre + ' ' + u.apellido AS operario
    FROM Lotes_Produccion l
    JOIN Productos p ON l.id_producto = p.id_producto
    JOIN Usuarios  u ON l.id_usuario  = u.id_usuario
    ORDER BY l.fecha_elaboracion DESC
  `)

  const resInsumos = await pool.request().query(`
    SELECT
      il.id_lote, il.id_insumo,
      i.nombre AS insumo, i.unidad_medida,
      il.cantidad_usada
    FROM Insumos_Lote il
    JOIN Insumos i ON il.id_insumo = i.id_insumo
  `)

  const insumosPorLote = agruparPor(resInsumos.recordset, 'id_lote', (fila) => ({
    id_insumo: fila.id_insumo,
    insumo: fila.insumo,
    unidad_medida: fila.unidad_medida,
    cantidad_usada: fila.cantidad_usada,
  }))

  res.json(resLotes.recordset.map((lote) => ({
    ...lote,
    insumos: insumosPorLote[lote.id_lote] || [],
  })))
}))

router.post('/', permitirRoles(ROLES.ADMIN, ROLES.OPERARIO), conMensajeDeError('Error al crear lote', async (req, res) => {
  const { id_producto, fecha_elaboracion, fecha_vencimiento, cantidad_producida, observaciones, insumos } = req.body

  if (!id_producto || !fecha_elaboracion || !fecha_vencimiento || !cantidad_producida) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  if (fecha_vencimiento <= fecha_elaboracion) {
    return res.status(400).json({ error: 'La fecha de vencimiento debe ser posterior a la fecha de elaboración.' })
  }

  const hayInsumos = Array.isArray(insumos) && insumos.length > 0
  const esFilaValida = (fila) => fila.id_insumo && fila.cantidad_usada

  const pool = await conectar()

  const insumosPorId = {}
  if (hayInsumos) {
    const ids = insumos.map((i) => Number(i.id_insumo)).join(',')
    const resStock = await pool.request().query(`
      SELECT id_insumo, nombre, stock_actual, unidad_medida
      FROM Insumos
      WHERE id_insumo IN (${ids})
    `)
    resStock.recordset.forEach((insumo) => { insumosPorId[insumo.id_insumo] = insumo })

    const faltantes = []
    for (const fila of insumos) {
      if (!esFilaValida(fila)) continue

      const insumo = insumosPorId[Number(fila.id_insumo)]
      if (!insumo) continue

      const cantidadPedida = Number(fila.cantidad_usada)
      if (insumo.stock_actual < cantidadPedida) {
        faltantes.push({
          nombre: insumo.nombre,
          solicitado: cantidadPedida,
          disponible: insumo.stock_actual,
          unidad: insumo.unidad_medida,
        })
      }
    }

    if (faltantes.length > 0) {
      return res.status(400).json({
        error: 'Stock insuficiente de insumos para crear el lote.',
        detalle: faltantes,
      })
    }
  }

  const resLote = await pool.request()
    .input('id_producto', Number(id_producto))
    .input('id_usuario', req.usuario.id)
    .input('cantidad_producida', Number(cantidad_producida))
    .input('fecha_elaboracion', fecha_elaboracion)
    .input('fecha_vencimiento', fecha_vencimiento)
    .input('observaciones', observaciones || null)
    .query(`
      INSERT INTO Lotes_Produccion
        (id_producto, id_usuario, nro_lote, cantidad_producida, fecha_elaboracion, fecha_vencimiento, estado, observaciones)
      VALUES
        (@id_producto, @id_usuario, 'TEMP', @cantidad_producida, @fecha_elaboracion, @fecha_vencimiento, 'En proceso', @observaciones)
      SELECT SCOPE_IDENTITY() AS id_lote
    `)

  const idLote = resLote.recordset[0].id_lote
  const nroLote = generarNumero('LOT', idLote)

  await pool.request()
    .input('id', idLote)
    .input('nro', nroLote)
    .query('UPDATE Lotes_Produccion SET nro_lote = @nro WHERE id_lote = @id')

  if (hayInsumos) {
    for (const fila of insumos) {
      if (!esFilaValida(fila)) continue

      const idInsumo = Number(fila.id_insumo)
      const cantidadUsada = Number(fila.cantidad_usada)
      const insumo = insumosPorId[idInsumo]
      const stockAnterior = insumo ? insumo.stock_actual : 0

      await pool.request()
        .input('id_lote', idLote)
        .input('id_insumo', idInsumo)
        .input('cantidad_usada', cantidadUsada)
        .query(`
          INSERT INTO Insumos_Lote (id_lote, id_insumo, cantidad_usada)
          VALUES (@id_lote, @id_insumo, @cantidad_usada)
        `)

      await pool.request()
        .input('id_insumo', idInsumo)
        .input('cantidad', cantidadUsada)
        .query('UPDATE Insumos SET stock_actual = stock_actual - @cantidad WHERE id_insumo = @id_insumo')

      await registrarMovimientoStock(pool, {
        tipoEntidad: 'insumo',
        idEntidad: idInsumo,
        nombreEntidad: insumo ? insumo.nombre : `Insumo ${fila.id_insumo}`,
        tipoMovimiento: 'produccion_creada',
        cantidad: -cantidadUsada,
        stockAnterior,
        stockNuevo: stockAnterior - cantidadUsada,
        idUsuario: req.usuario.id,
        referencia: nroLote,
      })
    }
  }

  res.status(201).json({ mensaje: 'Lote creado', nro_lote: nroLote })
}))

router.patch('/:id/finalizar', permitirRoles(ROLES.ADMIN, ROLES.OPERARIO), conMensajeDeError('Error al finalizar lote', async (req, res) => {
  const pool = await conectar()
  const idLote = parseInt(req.params.id)

  const resLote = await pool.request()
    .input('id', idLote)
    .query('SELECT estado FROM Lotes_Produccion WHERE id_lote = @id')

  const lote = resLote.recordset[0]
  if (!lote) {
    return res.status(404).json({ error: 'Lote no encontrado' })
  }
  if (lote.estado !== 'En proceso') {
    return res.status(400).json({ error: 'Solo se pueden finalizar lotes en estado En proceso' })
  }

  await pool.request()
    .input('id', idLote)
    .query("UPDATE Lotes_Produccion SET estado = 'Finalizado' WHERE id_lote = @id")

  res.json({ mensaje: 'Lote marcado como Finalizado' })
}))

router.patch('/:id/controlar', permitirRoles(ROLES.ADMIN), conMensajeDeError('Error al controlar lote', async (req, res) => {
  const pool = await conectar()
  const idLote = parseInt(req.params.id)
  const { observaciones } = req.body

  const resLote = await pool.request()
    .input('id', idLote)
    .query(`
      SELECT l.estado, l.id_producto, l.cantidad_producida, l.nro_lote, p.nombre AS nombre_producto
      FROM Lotes_Produccion l
      JOIN Productos p ON l.id_producto = p.id_producto
      WHERE l.id_lote = @id
    `)

  const lote = resLote.recordset[0]
  if (!lote) {
    return res.status(404).json({ error: 'Lote no encontrado' })
  }
  if (lote.estado !== 'Finalizado') {
    return res.status(400).json({ error: 'Solo se pueden controlar lotes en estado Finalizado' })
  }

  const resStock = await pool.request()
    .input('id_producto', lote.id_producto)
    .query('SELECT stock_actual FROM Productos WHERE id_producto = @id_producto')
  const stockAnterior = resStock.recordset[0].stock_actual

  await pool.request()
    .input('id', idLote)
    .input('observaciones', observaciones || null)
    .query("UPDATE Lotes_Produccion SET estado = 'Controlado', observaciones = @observaciones WHERE id_lote = @id")

  await pool.request()
    .input('id_producto', lote.id_producto)
    .input('cantidad', lote.cantidad_producida)
    .query('UPDATE Productos SET stock_actual = stock_actual + @cantidad WHERE id_producto = @id_producto')

  const cantidad = Number(lote.cantidad_producida)
  await registrarMovimientoStock(pool, {
    tipoEntidad: 'producto',
    idEntidad: lote.id_producto,
    nombreEntidad: lote.nombre_producto,
    tipoMovimiento: 'lote_controlado',
    cantidad,
    stockAnterior,
    stockNuevo: stockAnterior + cantidad,
    idUsuario: req.usuario.id,
    referencia: lote.nro_lote,
  })

  res.json({ mensaje: 'Lote controlado y stock de producto actualizado' })
}))

module.exports = router
