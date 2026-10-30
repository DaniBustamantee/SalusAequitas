const express = require('express')
const { conectar } = require('../db')
const verificarToken = require('../middleware/auth')
const { ROLES, permitirRoles } = require('../middleware/roles')
const {
  agruparPor,
  SQL_RESULTADO_ENTREGA,
  buscarIdTransportista,
  registrarCambioEstado,
} = require('../utils/funciones')
const { conMensajeDeError } = require('../middleware/errores')

const router = express.Router()
router.use(verificarToken)

const ESTADO_ENTREGADO = 7

async function buscarEnvioDelTransportista(pool, idEnvio, idTransportista) {
  const resultado = await pool.request()
    .input('id', idEnvio)
    .input('id_trans', idTransportista)
    .query(`
      SELECT id_envio, id_pedido, resultado_entrega, tiene_incidencia
      FROM Envios
      WHERE id_envio = @id AND id_transportista = @id_trans
    `)
  return resultado.recordset[0] || null
}

router.get('/', permitirRoles(ROLES.ADMIN), conMensajeDeError('Error al obtener envíos', async (req, res) => {
  const pool = await conectar()
  const resultado = await pool.request().query(`
    SELECT
      e.id_envio, e.nro_envio,
      e.id_pedido, p.nro_pedido,
      e.id_transportista,
      u.nombre + ' ' + u.apellido AS transportista,
      CONVERT(VARCHAR(10), e.fecha_despacho,     23) AS fecha_despacho,
      CONVERT(VARCHAR(10), e.fecha_entrega_est,  23) AS fecha_entrega_est,
      CONVERT(VARCHAR(10), e.fecha_entrega_real, 23) AS fecha_entrega_real,
      ${SQL_RESULTADO_ENTREGA},
      e.porcentaje_ruta,
      e.receptor_nombre, e.observaciones,
      e.tiene_incidencia, e.detalle_incidencia
    FROM Envios e
    JOIN Pedidos        p  ON e.id_pedido        = p.id_pedido
    JOIN Transportistas tr ON e.id_transportista = tr.id_transportista
    JOIN Usuarios       u  ON tr.id_usuario      = u.id_usuario
    ORDER BY e.fecha_despacho DESC
  `)
  res.json(resultado.recordset)
}))

router.get('/mis-envios', permitirRoles(ROLES.TRANSPORTISTA), conMensajeDeError('Error al obtener mis envíos', async (req, res) => {
  const pool = await conectar()

  const idTransportista = await buscarIdTransportista(pool, req.usuario.id)
  if (idTransportista === null) {
    return res.json([])
  }

  const resEnvios = await pool.request()
    .input('id_trans', idTransportista)
    .query(`
      SELECT
        e.id_envio, e.nro_envio,
        e.id_pedido, p.nro_pedido,
        p.direccion_entrega, p.ciudad_entrega,
        p.contacto_receptor, p.telefono_receptor, p.notas,
        CONVERT(VARCHAR(10), e.fecha_despacho,     23) AS fecha_despacho,
        CONVERT(VARCHAR(10), e.fecha_entrega_est,  23) AS fecha_entrega_est,
        CONVERT(VARCHAR(10), e.fecha_entrega_real, 23) AS fecha_entrega_real,
        e.resultado_entrega, e.observaciones,
        e.tiene_incidencia, e.detalle_incidencia
      FROM Envios e
      JOIN Pedidos p ON e.id_pedido = p.id_pedido
      WHERE e.id_transportista = @id_trans
      ORDER BY e.fecha_despacho DESC
    `)

  const envios = resEnvios.recordset
  if (envios.length === 0) {
    return res.json([])
  }

  const idsPedidos = envios.map((e) => e.id_pedido).join(',')
  const resItems = await pool.request().query(`
    SELECT ip.id_pedido, ip.id_producto, pr.nombre AS producto, ip.cantidad
    FROM Items_Pedido ip
    JOIN Productos pr ON ip.id_producto = pr.id_producto
    WHERE ip.id_pedido IN (${idsPedidos})
  `)

  const itemsPorPedido = agruparPor(resItems.recordset, 'id_pedido', (item) => ({
    id_producto: item.id_producto,
    producto: item.producto,
    cantidad: item.cantidad,
  }))

  res.json(envios.map((envio) => ({
    ...envio,
    items: itemsPorPedido[envio.id_pedido] || [],
  })))
}))

router.patch('/:id/confirmar', permitirRoles(ROLES.TRANSPORTISTA), conMensajeDeError('Error al confirmar entrega', async (req, res) => {
  const { resultado, observaciones } = req.body

  if (!resultado) {
    return res.status(400).json({ error: 'Falta el campo resultado' })
  }

  const pool = await conectar()
  const idEnvio = parseInt(req.params.id)

  const idTransportista = await buscarIdTransportista(pool, req.usuario.id)
  if (idTransportista === null) {
    return res.status(403).json({ error: 'No sos transportista registrado' })
  }

  const envio = await buscarEnvioDelTransportista(pool, idEnvio, idTransportista)
  if (!envio) {
    return res.status(404).json({ error: 'Envío no encontrado' })
  }
  if (envio.resultado_entrega) {
    return res.status(400).json({ error: 'Este envío ya fue confirmado' })
  }

  await pool.request()
    .input('id', idEnvio)
    .input('resultado', resultado)
    .input('observaciones', observaciones || null)
    .query(`
      UPDATE Envios
      SET resultado_entrega  = @resultado,
          fecha_entrega_real = CAST(GETDATE() AS DATE),
          observaciones      = @observaciones
      WHERE id_envio = @id
    `)

  if (resultado === 'completo' || resultado === 'parcial') {
    await pool.request()
      .input('id_pedido', envio.id_pedido)
      .query(`
        UPDATE Pedidos
        SET id_estado = ${ESTADO_ENTREGADO}, fecha_ultima_modif = GETDATE()
        WHERE id_pedido = @id_pedido
      `)

    await registrarCambioEstado(pool, {
      idPedido: envio.id_pedido,
      idEstado: ESTADO_ENTREGADO,
      idUsuario: req.usuario.id,
      observacion: observaciones || null,
    })
  }

  res.json({ mensaje: 'Entrega confirmada' })
}))

router.patch('/:id/incidencia', permitirRoles(ROLES.TRANSPORTISTA), conMensajeDeError('Error al registrar incidencia', async (req, res) => {
  const { detalle } = req.body

  if (!detalle || !detalle.trim()) {
    return res.status(400).json({ error: 'Describí el problema para registrar la incidencia.' })
  }

  const detalleLimpio = detalle.trim()

  const pool = await conectar()
  const idEnvio = parseInt(req.params.id)

  const idTransportista = await buscarIdTransportista(pool, req.usuario.id)
  if (idTransportista === null) {
    return res.status(403).json({ error: 'No sos transportista registrado' })
  }

  const envio = await buscarEnvioDelTransportista(pool, idEnvio, idTransportista)
  if (!envio) {
    return res.status(404).json({ error: 'Envío no encontrado' })
  }
  if (envio.resultado_entrega) {
    return res.status(400).json({ error: 'No podés reportar incidencia en un envío ya confirmado' })
  }

  await pool.request()
    .input('id', idEnvio)
    .input('detalle', detalleLimpio)
    .query(`
      UPDATE Envios
      SET tiene_incidencia   = 1,
          detalle_incidencia = @detalle
      WHERE id_envio = @id
    `)

  const resEstado = await pool.request()
    .input('id_pedido', envio.id_pedido)
    .query('SELECT id_estado FROM Pedidos WHERE id_pedido = @id_pedido')

  await registrarCambioEstado(pool, {
    idPedido: envio.id_pedido,
    idEstado: resEstado.recordset[0]?.id_estado,
    idUsuario: req.usuario.id,
    observacion: `Incidencia reportada: ${detalleLimpio}`,
  })

  res.json({ mensaje: 'Incidencia registrada correctamente' })
}))

module.exports = router
