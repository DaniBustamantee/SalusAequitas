const express = require('express')
const { conectar } = require('../db')
const verificarToken = require('../middleware/auth')
const { ROLES, permitirRoles } = require('../middleware/roles')
const { conMensajeDeError } = require('../middleware/errores')

const router = express.Router()
router.use(verificarToken)
router.use(permitirRoles(ROLES.ADMIN))

function limpiarIds(lista) {
  if (!Array.isArray(lista)) return []
  return lista.map(Number).filter((n) => Number.isInteger(n) && n > 0)
}

function redondear2(valor) {
  return Math.round(valor * 100) / 100
}

const ENTIDADES = {
  producto: {
    seleccion: 'SELECT id_producto AS id, nombre, precio_unitario AS precio FROM Productos WHERE id_producto IN',
    actualizacion: 'UPDATE Productos SET precio_unitario = @precio WHERE id_producto = @id',
  },
  materia_prima: {
    seleccion: "SELECT id_insumo AS id, nombre, costo_unitario AS precio FROM Insumos WHERE tipo = 'materia_prima' AND id_insumo IN",
    actualizacion: 'UPDATE Insumos SET costo_unitario = @precio WHERE id_insumo = @id',
  },
  insumo: {
    seleccion: "SELECT id_insumo AS id, nombre, costo_unitario AS precio FROM Insumos WHERE tipo = 'insumo' AND id_insumo IN",
    actualizacion: 'UPDATE Insumos SET costo_unitario = @precio WHERE id_insumo = @id',
  },
}

async function aplicarFactor(pool, tipoEntidad, ids, factor) {
  if (ids.length === 0) return []

  const { seleccion, actualizacion } = ENTIDADES[tipoEntidad]
  const resultado = await pool.request().query(`${seleccion} (${ids.join(',')})`)
  const cambios = []

  for (const entidad of resultado.recordset) {
    const precioNuevo = redondear2(entidad.precio * factor)

    await pool.request()
      .input('id', entidad.id)
      .input('precio', precioNuevo)
      .query(actualizacion)

    cambios.push({
      tipo_entidad: tipoEntidad,
      id_entidad: entidad.id,
      nombre_entidad: entidad.nombre,
      precio_anterior: entidad.precio,
      precio_nuevo: precioNuevo,
    })
  }

  return cambios
}

router.get('/historial', conMensajeDeError('Error al obtener historial', async (req, res) => {
  const pool = await conectar()
  const resultado = await pool.request().query(`
    SELECT TOP 300
      h.id_historial, h.tipo_entidad, h.id_entidad, h.nombre_entidad,
      h.precio_anterior, h.precio_nuevo, h.tipo_actualizacion,
      h.valor_referencia, h.notas,
      CONVERT(VARCHAR(19), h.fecha_actualizacion, 120) AS fecha_actualizacion,
      u.nombre + ' ' + u.apellido AS usuario
    FROM Historial_Precios h
    LEFT JOIN Usuarios u ON h.id_usuario = u.id_usuario
    ORDER BY h.fecha_actualizacion DESC
  `)
  res.json(resultado.recordset)
}))

router.get('/entidades', conMensajeDeError('Error al obtener entidades', async (req, res) => {
  const pool = await conectar()
  const [resProductos, resInsumos] = await Promise.all([
    pool.request().query('SELECT id_producto AS id, nombre, precio_unitario AS precio FROM Productos WHERE activo = 1 ORDER BY nombre'),
    pool.request().query('SELECT id_insumo AS id, nombre, costo_unitario AS precio, tipo FROM Insumos WHERE activo = 1 ORDER BY tipo, nombre'),
  ])

  const insumos = resInsumos.recordset
  res.json({
    productos: resProductos.recordset,
    materias_primas: insumos.filter((i) => i.tipo === 'materia_prima'),
    insumos: insumos.filter((i) => i.tipo === 'insumo'),
  })
}))

router.post('/actualizar', conMensajeDeError('Error al actualizar precios', async (req, res) => {
  const { tipo, porcentaje, dolar_anterior, dolar_nuevo, notas, ids_productos, ids_materias_primas, ids_insumos } = req.body

  let porcentajeAplicado
  let valorReferencia

  if (tipo === 'dolar') {
    const dolarAnterior = Number(dolar_anterior)
    const dolarNuevo = Number(dolar_nuevo)

    if (!dolarAnterior || !dolarNuevo || dolarAnterior <= 0 || dolarNuevo <= 0) {
      return res.status(400).json({ error: 'Valores de dólar inválidos' })
    }

    porcentajeAplicado = ((dolarNuevo - dolarAnterior) / dolarAnterior) * 100
    const signo = porcentajeAplicado >= 0 ? '+' : ''
    valorReferencia = `Dólar $${dolarAnterior.toLocaleString()} → $${dolarNuevo.toLocaleString()} (${signo}${porcentajeAplicado.toFixed(2)}%)`
  } else if (tipo === 'porcentual') {
    porcentajeAplicado = Number(porcentaje)

    if (isNaN(porcentajeAplicado)) {
      return res.status(400).json({ error: 'Porcentaje inválido' })
    }

    const signo = porcentajeAplicado >= 0 ? '+' : ''
    valorReferencia = `${signo}${porcentajeAplicado}%`
  } else {
    return res.status(400).json({ error: 'Tipo inválido' })
  }

  const factor = 1 + porcentajeAplicado / 100

  const pool = await conectar()

  const cambios = [
    ...await aplicarFactor(pool, 'producto', limpiarIds(ids_productos), factor),
    ...await aplicarFactor(pool, 'materia_prima', limpiarIds(ids_materias_primas), factor),
    ...await aplicarFactor(pool, 'insumo', limpiarIds(ids_insumos), factor),
  ]

  for (const cambio of cambios) {
    await pool.request()
      .input('tipo_entidad', cambio.tipo_entidad)
      .input('id_entidad', cambio.id_entidad)
      .input('nombre_entidad', cambio.nombre_entidad)
      .input('precio_anterior', cambio.precio_anterior)
      .input('precio_nuevo', cambio.precio_nuevo)
      .input('tipo_actualizacion', tipo)
      .input('valor_referencia', valorReferencia)
      .input('id_usuario', req.usuario.id)
      .input('notas', notas || null)
      .query(`
        INSERT INTO Historial_Precios
          (tipo_entidad, id_entidad, nombre_entidad, precio_anterior, precio_nuevo, tipo_actualizacion, valor_referencia, id_usuario, notas)
        VALUES
          (@tipo_entidad, @id_entidad, @nombre_entidad, @precio_anterior, @precio_nuevo, @tipo_actualizacion, @valor_referencia, @id_usuario, @notas)
      `)
  }

  res.json({ mensaje: 'Precios actualizados', total: cambios.length, porcentaje_aplicado: porcentajeAplicado })
}))

module.exports = router
