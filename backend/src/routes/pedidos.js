const express = require('express')
const { conectar } = require('../db')
const verificarToken = require('../middleware/auth')
const { ROLES, permitirRoles, esRol } = require('../middleware/roles')
const {
  agruparPor,
  generarNumero,
  buscarIdCliente,
  registrarCambioEstado,
} = require('../utils/funciones')
const { conMensajeDeError } = require('../middleware/errores')

const router = express.Router()
router.use(verificarToken)

const ESTADO_PENDIENTE = 1
const PRIMER_ESTADO_NO_CANCELABLE = 4
const ESTADO_CANCELADO = 8

const DIAS_ENTREGA_ESTIMADA = 3

async function puedeVerPedido(pool, req, idClienteDelPedido) {
  if (!esRol(req, ROLES.CLIENTE)) return true
  const idCliente = await buscarIdCliente(pool, req.usuario.id)
  return idCliente !== null && idCliente === idClienteDelPedido
}

async function obtenerTotalesPorPedido(pool, idsPedidos = null) {
  const filtro = idsPedidos ? `WHERE id_pedido IN (${idsPedidos})` : ''
  const resultado = await pool.request().query(`
    SELECT id_pedido, ISNULL(SUM(subtotal), 0) AS total
    FROM Items_Pedido
    ${filtro}
    GROUP BY id_pedido
  `)

  const totales = {}
  resultado.recordset.forEach((fila) => { totales[fila.id_pedido] = Number(fila.total) })
  return totales
}

function sumarUnidades(items) {
  return items.reduce((total, item) => total + Number(item.cantidad), 0)
}

async function insertarItem(pool, idPedido, idProducto, cantidad, precioUnitario) {
  await pool.request()
    .input('id_pedido', idPedido)
    .input('id_producto', idProducto)
    .input('cantidad', cantidad)
    .input('precio_unitario', precioUnitario)
    .query(`
      INSERT INTO Items_Pedido (id_pedido, id_producto, cantidad, precio_unitario)
      VALUES (@id_pedido, @id_producto, @cantidad, @precio_unitario)
    `)
}

async function moverStockDelPedido(pool, idPedido, signo) {
  const operador = signo > 0 ? '+' : '-'
  const resItems = await pool.request()
    .input('id', idPedido)
    .query('SELECT id_producto, cantidad FROM Items_Pedido WHERE id_pedido = @id')

  for (const item of resItems.recordset) {
    await pool.request()
      .input('id_producto', item.id_producto)
      .input('cantidad', item.cantidad)
      .query(`
        UPDATE Productos
        SET stock_actual = stock_actual ${operador} @cantidad
        WHERE id_producto = @id_producto
      `)
  }
}

async function elegirTransportista(pool, idPedido) {
  const resZona = await pool.request()
    .input('id', idPedido)
    .query(`
      SELECT c.id_zona
      FROM Pedidos p
      JOIN Clientes c ON p.id_cliente = c.id_cliente
      WHERE p.id_pedido = @id
    `)

  const idZona = resZona.recordset[0]?.id_zona || null
  let candidatos = []

  if (idZona) {
    const resZonaTransp = await pool.request()
      .input('id_zona', idZona)
      .query(`
        SELECT TOP 1 t.id_transportista
        FROM Transportistas t
        JOIN Transportistas_Zonas tz ON t.id_transportista = tz.id_transportista
        LEFT JOIN Envios e ON t.id_transportista = e.id_transportista
                           AND e.resultado_entrega IS NULL
        WHERE tz.id_zona = @id_zona AND t.activo = 1
        GROUP BY t.id_transportista
        ORDER BY COUNT(e.id_envio) ASC
      `)
    candidatos = resZonaTransp.recordset
  }

  if (candidatos.length === 0) {
    const resTodos = await pool.request().query(`
      SELECT TOP 1 t.id_transportista
      FROM Transportistas t
      LEFT JOIN Envios e ON t.id_transportista = e.id_transportista
                         AND e.resultado_entrega IS NULL
      WHERE t.activo = 1
      GROUP BY t.id_transportista
      ORDER BY COUNT(e.id_envio) ASC
    `)
    candidatos = resTodos.recordset
  }

  return candidatos[0]?.id_transportista ?? null
}

async function crearEnvio(pool, idPedido, idTransportista) {
  await pool.request()
    .input('id', idPedido)
    .input('id_transportista', idTransportista)
    .query('UPDATE Pedidos SET id_transportista = @id_transportista WHERE id_pedido = @id')

  const resEnvio = await pool.request()
    .input('id_pedido', idPedido)
    .input('id_transportista', idTransportista)
    .query(`
      INSERT INTO Envios
        (id_pedido, id_transportista, nro_envio, fecha_despacho, fecha_entrega_est)
      OUTPUT INSERTED.id_envio
      VALUES
        (@id_pedido, @id_transportista, 'TEMP', GETDATE(), DATEADD(DAY, ${DIAS_ENTREGA_ESTIMADA}, GETDATE()))
    `)

  const idEnvio = resEnvio.recordset[0].id_envio
  const nroEnvio = generarNumero('ENV', idEnvio)

  await pool.request()
    .input('id', idEnvio)
    .input('nro', nroEnvio)
    .query('UPDATE Envios SET nro_envio = @nro WHERE id_envio = @id')

  const resNombre = await pool.request()
    .input('id_trans', idTransportista)
    .query(`
      SELECT u.nombre + ' ' + u.apellido AS nombre
      FROM Transportistas t
      JOIN Usuarios u ON t.id_usuario = u.id_usuario
      WHERE t.id_transportista = @id_trans
    `)

  return {
    transportista: resNombre.recordset[0]?.nombre || '—',
    nro_envio: nroEnvio,
  }
}

router.get('/', permitirRoles(ROLES.ADMIN), conMensajeDeError('Error al obtener pedidos', async (req, res) => {
  const pool = await conectar()

  const resPedidos = await pool.request().query(`
    SELECT
      p.id_pedido, p.nro_pedido,
      CONVERT(VARCHAR(10), p.fecha_pedido, 23)      AS fecha_pedido,
      CONVERT(VARCHAR(10), p.fecha_entrega_est, 23) AS fecha_entrega_est,
      p.ciudad_entrega, p.direccion_entrega,
      p.total_unidades, p.notas,
      p.id_estado, ep.nombre AS estado,
      p.id_cliente, c.razon_social,
      c.id_zona,
      p.id_transportista
    FROM Pedidos p
    JOIN Estados_Pedido ep ON p.id_estado  = ep.id_estado
    JOIN Clientes       c  ON p.id_cliente = c.id_cliente
    ORDER BY p.fecha_pedido DESC
  `)

  const totales = await obtenerTotalesPorPedido(pool)

  res.json(resPedidos.recordset.map((pedido) => ({
    ...pedido,
    total: totales[pedido.id_pedido] || 0,
  })))
}))

router.get('/mis-pedidos', permitirRoles(ROLES.CLIENTE), conMensajeDeError('Error al obtener mis pedidos', async (req, res) => {
  const pool = await conectar()

  const idCliente = await buscarIdCliente(pool, req.usuario.id)
  if (idCliente === null) {
    return res.json([])
  }

  const resPedidos = await pool.request()
    .input('id_cliente', idCliente)
    .query(`
      SELECT
        p.id_pedido, p.nro_pedido,
        CONVERT(VARCHAR(10), p.fecha_pedido,      23) AS fecha_pedido,
        CONVERT(VARCHAR(10), p.fecha_entrega_est, 23) AS fecha_entrega_est,
        p.ciudad_entrega, p.direccion_entrega,
        p.contacto_receptor, p.telefono_receptor,
        p.total_unidades, p.notas,
        p.id_estado, ep.nombre AS estado
      FROM Pedidos p
      JOIN Estados_Pedido ep ON p.id_estado = ep.id_estado
      WHERE p.id_cliente = @id_cliente
      ORDER BY p.fecha_pedido DESC
    `)

  const pedidos = resPedidos.recordset
  if (pedidos.length === 0) {
    return res.json([])
  }

  const idsPedidos = pedidos.map((p) => p.id_pedido).join(',')
  const totales = await obtenerTotalesPorPedido(pool, idsPedidos)

  const resItems = await pool.request().query(`
    SELECT ip.id_pedido, ip.id_producto, pr.nombre AS producto,
           ip.cantidad, ip.precio_unitario, ip.subtotal,
           pr.imagen_url, pr.stock_actual
    FROM Items_Pedido ip
    JOIN Productos pr ON ip.id_producto = pr.id_producto
    WHERE ip.id_pedido IN (${idsPedidos})
  `)
  const itemsPorPedido = agruparPor(resItems.recordset, 'id_pedido')

  res.json(pedidos.map((pedido) => ({
    ...pedido,
    total: totales[pedido.id_pedido] || 0,
    items: itemsPorPedido[pedido.id_pedido] || [],
  })))
}))

router.post('/', permitirRoles(ROLES.CLIENTE), conMensajeDeError('Error al crear el pedido', async (req, res) => {
  const { direccion_entrega, ciudad_entrega, contacto_receptor, telefono_receptor, notas, items } = req.body

  if (!direccion_entrega || !ciudad_entrega || !contacto_receptor) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Agregá al menos un producto' })
  }

  const pool = await conectar()

  const idCliente = await buscarIdCliente(pool, req.usuario.id)
  if (idCliente === null) {
    return res.status(403).json({ error: 'No sos cliente registrado' })
  }

  const idsProductos = items.map((i) => Number(i.id_producto)).join(',')
  const resProductos = await pool.request().query(`
    SELECT id_producto, precio_unitario, stock_actual, nombre
    FROM Productos
    WHERE id_producto IN (${idsProductos}) AND activo = 1
  `)

  const productosPorId = {}
  resProductos.recordset.forEach((p) => { productosPorId[p.id_producto] = p })

  const faltantes = []
  for (const item of items) {
    const producto = productosPorId[Number(item.id_producto)]
    if (!producto) {
      return res.status(400).json({ error: 'Producto no encontrado' })
    }
    if (producto.stock_actual < Number(item.cantidad)) {
      faltantes.push({
        nombre: producto.nombre,
        solicitado: Number(item.cantidad),
        disponible: producto.stock_actual,
      })
    }
  }
  if (faltantes.length > 0) {
    return res.status(400).json({ error: 'Stock insuficiente', detalle: faltantes })
  }

  const resPedido = await pool.request()
    .input('id_cliente', idCliente)
    .input('direccion', direccion_entrega)
    .input('ciudad', ciudad_entrega)
    .input('contacto', contacto_receptor)
    .input('telefono', telefono_receptor || null)
    .input('notas', notas || null)
    .input('total_unidades', sumarUnidades(items))
    .query(`
      INSERT INTO Pedidos
        (id_cliente, id_estado, nro_pedido, fecha_pedido,
         direccion_entrega, ciudad_entrega, contacto_receptor,
         telefono_receptor, total_unidades, notas)
      VALUES
        (@id_cliente, ${ESTADO_PENDIENTE}, 'TEMP', GETDATE(),
         @direccion, @ciudad, @contacto,
         @telefono, @total_unidades, @notas)
      SELECT SCOPE_IDENTITY() AS id_pedido
    `)

  const idPedido = resPedido.recordset[0].id_pedido
  const nroPedido = generarNumero('PED', idPedido)

  await pool.request()
    .input('id', idPedido)
    .input('nro', nroPedido)
    .query('UPDATE Pedidos SET nro_pedido = @nro WHERE id_pedido = @id')

  for (const item of items) {
    const idProducto = Number(item.id_producto)
    await insertarItem(pool, idPedido, idProducto, Number(item.cantidad), productosPorId[idProducto].precio_unitario)
  }

  await pool.request()
    .input('id_pedido', idPedido)
    .input('id_estado', ESTADO_PENDIENTE)
    .input('cambiado_por', req.usuario.id)
    .query(`
      INSERT INTO Historial_Estados_Pedido (id_pedido, id_estado, cambiado_por)
      VALUES (@id_pedido, @id_estado, @cambiado_por)
    `)

  res.status(201).json({ mensaje: 'Pedido creado', nro_pedido: nroPedido, id_pedido: idPedido })
}))

router.put('/:id', permitirRoles(ROLES.CLIENTE), conMensajeDeError('Error al modificar el pedido', async (req, res) => {
  const { direccion_entrega, ciudad_entrega, contacto_receptor, telefono_receptor, notas, items } = req.body

  const pool = await conectar()
  const idPedido = parseInt(req.params.id)

  const idCliente = await buscarIdCliente(pool, req.usuario.id)
  if (idCliente === null) {
    return res.status(403).json({ error: 'No sos cliente registrado' })
  }

  const resPedido = await pool.request()
    .input('id', idPedido)
    .input('id_cliente', idCliente)
    .query(`
      SELECT p.id_pedido, ep.nombre AS estado
      FROM Pedidos p
      JOIN Estados_Pedido ep ON p.id_estado = ep.id_estado
      WHERE p.id_pedido = @id AND p.id_cliente = @id_cliente
    `)

  const pedido = resPedido.recordset[0]
  if (!pedido) {
    return res.status(404).json({ error: 'Pedido no encontrado' })
  }
  if (pedido.estado !== 'Pendiente') {
    return res.status(400).json({ error: 'Solo se pueden modificar pedidos en estado Pendiente' })
  }

  await pool.request()
    .input('id', idPedido)
    .input('direccion', direccion_entrega)
    .input('ciudad', ciudad_entrega)
    .input('contacto', contacto_receptor)
    .input('telefono', telefono_receptor || null)
    .input('notas', notas || null)
    .query(`
      UPDATE Pedidos
      SET direccion_entrega  = @direccion,
          ciudad_entrega     = @ciudad,
          contacto_receptor  = @contacto,
          telefono_receptor  = @telefono,
          notas              = @notas,
          fecha_ultima_modif = GETDATE()
      WHERE id_pedido = @id
    `)

  if (Array.isArray(items) && items.length > 0) {
    const idsProductos = items.map((i) => Number(i.id_producto)).join(',')
    const resPrecios = await pool.request().query(`
      SELECT id_producto, precio_unitario FROM Productos
      WHERE id_producto IN (${idsProductos})
    `)
    const precioPorProducto = {}
    resPrecios.recordset.forEach((p) => { precioPorProducto[p.id_producto] = p.precio_unitario })

    await pool.request()
      .input('id', idPedido)
      .query('DELETE FROM Items_Pedido WHERE id_pedido = @id')

    for (const item of items) {
      const idProducto = Number(item.id_producto)
      await insertarItem(pool, idPedido, idProducto, Number(item.cantidad), precioPorProducto[idProducto] || 0)
    }

    await pool.request()
      .input('id', idPedido)
      .input('total', sumarUnidades(items))
      .query('UPDATE Pedidos SET total_unidades = @total WHERE id_pedido = @id')
  }

  res.json({ mensaje: 'Pedido modificado' })
}))

router.get('/:id', permitirRoles(ROLES.ADMIN, ROLES.CLIENTE), conMensajeDeError('Error al obtener el pedido', async (req, res) => {
  const pool = await conectar()
  const idPedido = parseInt(req.params.id)

  const resPedido = await pool.request()
    .input('id', idPedido)
    .query(`
      SELECT
        p.id_pedido, p.nro_pedido,
        CONVERT(VARCHAR(10), p.fecha_pedido, 23)      AS fecha_pedido,
        CONVERT(VARCHAR(10), p.fecha_entrega_est, 23) AS fecha_entrega_est,
        p.ciudad_entrega, p.direccion_entrega,
        p.contacto_receptor, p.telefono_receptor,
        p.total_unidades, p.notas,
        p.id_estado, ep.nombre AS estado, ep.es_final, ep.orden AS orden_estado,
        p.id_cliente, c.razon_social,
        p.id_transportista,
        ut.nombre + ' ' + ut.apellido AS transportista
      FROM Pedidos p
      JOIN Estados_Pedido      ep ON p.id_estado        = ep.id_estado
      JOIN Clientes            c  ON p.id_cliente       = c.id_cliente
      LEFT JOIN Transportistas tr ON p.id_transportista = tr.id_transportista
      LEFT JOIN Usuarios       ut ON tr.id_usuario      = ut.id_usuario
      WHERE p.id_pedido = @id
    `)

  const pedido = resPedido.recordset[0]
  if (!pedido || !(await puedeVerPedido(pool, req, pedido.id_cliente))) {
    return res.status(404).json({ error: 'Pedido no encontrado' })
  }

  const resItems = await pool.request()
    .input('id', idPedido)
    .query(`
      SELECT ip.id_item, ip.id_producto, pr.nombre AS producto,
             ip.cantidad, ip.precio_unitario, ip.subtotal
      FROM Items_Pedido ip
      JOIN Productos pr ON ip.id_producto = pr.id_producto
      WHERE ip.id_pedido = @id
    `)

  const resHistorial = await pool.request()
    .input('id', idPedido)
    .query(`
      SELECT h.id_historial, h.id_estado, ep.nombre AS estado,
             CONVERT(VARCHAR(16), h.fecha_cambio, 120) AS fecha,
             h.observacion
      FROM Historial_Estados_Pedido h
      JOIN Estados_Pedido ep ON h.id_estado = ep.id_estado
      WHERE h.id_pedido = @id
      ORDER BY h.fecha_cambio ASC
    `)

  res.json({
    ...pedido,
    items: resItems.recordset,
    historial: resHistorial.recordset,
  })
}))

router.patch('/:id/estado', permitirRoles(ROLES.ADMIN, ROLES.CLIENTE), conMensajeDeError('Error al cambiar estado', async (req, res) => {
  const { accion, observacion } = req.body

  if (!accion) {
    return res.status(400).json({ error: 'Falta el campo accion' })
  }

  const pool = await conectar()
  const idPedido = parseInt(req.params.id)

  const resPedido = await pool.request()
    .input('id', idPedido)
    .query(`
      SELECT p.id_estado, p.id_cliente, ep.orden, ep.es_final, ep.nombre AS estado_actual
      FROM Pedidos p
      JOIN Estados_Pedido ep ON p.id_estado = ep.id_estado
      WHERE p.id_pedido = @id
    `)

  const pedido = resPedido.recordset[0]
  if (!pedido || !(await puedeVerPedido(pool, req, pedido.id_cliente))) {
    return res.status(404).json({ error: 'Pedido no encontrado' })
  }
  if (esRol(req, ROLES.CLIENTE) && accion !== 'cancelar') {
    return res.status(403).json({ error: 'Solo podés cancelar tus pedidos' })
  }
  if (pedido.es_final) {
    return res.status(400).json({ error: 'El pedido ya está en estado final' })
  }
  if (accion === 'cancelar' && pedido.id_estado >= PRIMER_ESTADO_NO_CANCELABLE) {
    return res.status(400).json({
      error: `No se puede cancelar un pedido en estado "${pedido.estado_actual}". Solo se puede cancelar hasta "En preparación".`,
    })
  }

  let idNuevoEstado
  let nombreNuevoEstado

  if (accion === 'cancelar') {
    idNuevoEstado = ESTADO_CANCELADO
    nombreNuevoEstado = 'Cancelado'
  } else if (accion === 'avanzar') {
    const resSiguiente = await pool.request()
      .input('orden', pedido.orden + 1)
      .query('SELECT id_estado, nombre FROM Estados_Pedido WHERE orden = @orden AND activo = 1')

    const siguiente = resSiguiente.recordset[0]
    if (!siguiente) {
      return res.status(400).json({ error: 'No hay estado siguiente' })
    }
    idNuevoEstado = siguiente.id_estado
    nombreNuevoEstado = siguiente.nombre
  } else {
    return res.status(400).json({ error: 'Acción no válida. Usá "avanzar" o "cancelar"' })
  }

  const seConfirma = nombreNuevoEstado === 'Confirmado'

  if (seConfirma) {
    const resStock = await pool.request()
      .input('id', idPedido)
      .query(`
        SELECT ip.cantidad, pr.nombre, pr.stock_actual
        FROM Items_Pedido ip
        JOIN Productos pr ON ip.id_producto = pr.id_producto
        WHERE ip.id_pedido = @id
      `)

    const faltantes = resStock.recordset.filter((item) => item.stock_actual < item.cantidad)
    if (faltantes.length > 0) {
      return res.status(400).json({
        error: 'Stock insuficiente para confirmar el pedido',
        detalle: faltantes.map((i) => ({ nombre: i.nombre, solicitado: i.cantidad, disponible: i.stock_actual })),
      })
    }
  }

  await pool.request()
    .input('id', idPedido)
    .input('estado', idNuevoEstado)
    .query(`
      UPDATE Pedidos
      SET id_estado = @estado,
          fecha_ultima_modif = GETDATE(),
          fecha_cancelacion = CASE WHEN @estado = ${ESTADO_CANCELADO} THEN GETDATE() ELSE fecha_cancelacion END
      WHERE id_pedido = @id
    `)

  await registrarCambioEstado(pool, {
    idPedido,
    idEstado: idNuevoEstado,
    idUsuario: req.usuario.id,
    observacion: observacion || null,
  })

  if (accion === 'cancelar' && pedido.estado_actual !== 'Pendiente') {
    await moverStockDelPedido(pool, idPedido, +1)
  }

  let alertasStock = []
  if (seConfirma) {
    await moverStockDelPedido(pool, idPedido, -1)

    const resAlertas = await pool.request()
      .input('id', idPedido)
      .query(`
        SELECT pr.nombre, pr.stock_actual, pr.stock_minimo, pr.stock_critico
        FROM Items_Pedido ip
        JOIN Productos pr ON ip.id_producto = pr.id_producto
        WHERE ip.id_pedido = @id
          AND pr.stock_actual <= pr.stock_minimo
      `)
    alertasStock = resAlertas.recordset
  }

  let asignacion = null
  if (nombreNuevoEstado === 'Despachado') {
    const idTransportista = await elegirTransportista(pool, idPedido)
    if (idTransportista !== null) {
      asignacion = await crearEnvio(pool, idPedido, idTransportista)
    }
  }

  res.json({ mensaje: 'Estado actualizado', asignacion, alertas_stock: alertasStock })
}))

module.exports = router
