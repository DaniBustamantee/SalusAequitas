const express = require('express')
const { conectar } = require('../db')
const verificarToken = require('../middleware/auth')
const { ROLES, permitirRoles } = require('../middleware/roles')
const { conMensajeDeError } = require('../middleware/errores')
const { SQL_RESULTADO_ENTREGA } = require('../utils/funciones')

const router = express.Router()
router.use(verificarToken)
router.use(permitirRoles(ROLES.ADMIN))

function crearReporte(consulta, mensajeError) {
  return conMensajeDeError(mensajeError, async (req, res) => {
    const pool = await conectar()
    const resultado = await pool.request().query(consulta)
    res.json(resultado.recordset)
  })
}

router.get('/ventas-producto', crearReporte(`
  SELECT
    ip.id_producto,
    pr.nombre,
    pr.imagen_url,
    SUM(ip.cantidad) AS total_unidades
  FROM Items_Pedido ip
  JOIN Productos pr ON ip.id_producto = pr.id_producto
  JOIN Pedidos   p  ON ip.id_pedido   = p.id_pedido
  WHERE p.id_estado <> 8
  GROUP BY ip.id_producto, pr.nombre, pr.imagen_url
  ORDER BY total_unidades DESC
`, 'Error al obtener ventas por producto'))

router.get('/stock-critico', crearReporte(`
  SELECT id_producto, nombre, codigo, stock_actual, stock_minimo, stock_critico,
         stock_minimo - stock_actual AS faltante
  FROM Productos
  WHERE activo = 1 AND stock_actual <= stock_critico
  ORDER BY faltante DESC
`, 'Error al obtener stock crítico'))

router.get('/lotes-por-vencer', crearReporte(`
  SELECT l.id_lote, l.nro_lote, l.cantidad_producida, l.estado,
         CONVERT(VARCHAR(10), l.fecha_vencimiento, 23) AS fecha_vencimiento,
         DATEDIFF(DAY, GETDATE(), l.fecha_vencimiento) AS dias_restantes,
         p.nombre AS producto
  FROM Lotes_Produccion l
  JOIN Productos p ON l.id_producto = p.id_producto
  WHERE l.estado NOT IN ('Cancelado')
    AND l.fecha_vencimiento <= DATEADD(DAY, 60, GETDATE())
    AND l.fecha_vencimiento >= GETDATE()
  ORDER BY l.fecha_vencimiento ASC
`, 'Error al obtener lotes por vencer'))

router.get('/entregas-fallidas', crearReporte(`
  SELECT e.id_envio,
         ${SQL_RESULTADO_ENTREGA},
         e.observaciones,
         CONVERT(VARCHAR(10), e.fecha_entrega_real, 23) AS fecha_entrega,
         p.nro_pedido, p.ciudad_entrega,
         c.razon_social AS cliente,
         u.nombre + ' ' + u.apellido AS transportista
  FROM Envios e
  JOIN Pedidos        p  ON e.id_pedido       = p.id_pedido
  JOIN Clientes       c  ON p.id_cliente      = c.id_cliente
  JOIN Transportistas tr ON e.id_transportista = tr.id_transportista
  JOIN Usuarios       u  ON tr.id_usuario     = u.id_usuario
  WHERE LOWER(ISNULL(e.resultado_entrega,'')) IN ('fallido', 'parcial')
  ORDER BY e.fecha_entrega_real DESC
`, 'Error al obtener entregas fallidas'))

router.get('/pedidos-cancelados', crearReporte(`
  SELECT p.id_pedido, p.nro_pedido,
         cancelacion.observacion AS motivo,
         CONVERT(VARCHAR(10), p.fecha_pedido, 23) AS fecha_pedido,
         c.razon_social AS cliente,
         ep_previo.nombre AS estado_previo
  FROM Pedidos p
  JOIN Clientes c ON p.id_cliente = c.id_cliente
  OUTER APPLY (
    SELECT TOP 1 h.id_historial, h.observacion
    FROM Historial_Estados_Pedido h
    WHERE h.id_pedido = p.id_pedido AND h.id_estado = 8
    ORDER BY h.id_historial DESC
  ) cancelacion
  OUTER APPLY (
    SELECT TOP 1 h.id_estado
    FROM Historial_Estados_Pedido h
    WHERE h.id_pedido = p.id_pedido
      AND h.id_estado <> 8
      AND (cancelacion.id_historial IS NULL OR h.id_historial < cancelacion.id_historial)
    ORDER BY h.id_historial DESC
  ) previo
  LEFT JOIN Estados_Pedido ep_previo ON ep_previo.id_estado = previo.id_estado
  WHERE p.id_estado = 8
  ORDER BY p.fecha_pedido DESC
`, 'Error al obtener pedidos cancelados'))

router.get('/movimientos-stock', crearReporte(`
  SELECT TOP 100
    m.id_movimiento, m.tipo_entidad, m.nombre_entidad,
    m.tipo_movimiento, m.cantidad, m.stock_anterior, m.stock_nuevo,
    m.referencia, m.observacion,
    CONVERT(VARCHAR(19), m.fecha, 120) AS fecha,
    u.nombre + ' ' + u.apellido AS usuario
  FROM Movimientos_Stock m
  LEFT JOIN Usuarios u ON m.id_usuario = u.id_usuario
  ORDER BY m.fecha DESC
`, 'Error al obtener movimientos de stock'))

router.get('/stock-actual', crearReporte(`
  SELECT id_producto, nombre, codigo, stock_actual, stock_minimo, stock_critico,
         activo,
         CASE
           WHEN stock_actual <= stock_critico THEN 'critico'
           WHEN stock_actual <= stock_minimo  THEN 'bajo'
           ELSE 'ok'
         END AS estado_stock
  FROM Productos
  ORDER BY nombre
`, 'Error al obtener stock actual'))

router.get('/entregas', crearReporte(`
  SELECT
    e.id_envio,
    p.nro_pedido,
    c.razon_social AS cliente,
    u.nombre + ' ' + u.apellido AS transportista,
    CONVERT(VARCHAR(10), e.fecha_despacho, 23)     AS fecha_despacho,
    CONVERT(VARCHAR(10), e.fecha_entrega_real, 23) AS fecha_entrega_real,
    ${SQL_RESULTADO_ENTREGA},
    p.ciudad_entrega,
    e.observaciones
  FROM Envios e
  JOIN Pedidos        p  ON e.id_pedido       = p.id_pedido
  JOIN Clientes       c  ON p.id_cliente      = c.id_cliente
  JOIN Transportistas tr ON e.id_transportista = tr.id_transportista
  JOIN Usuarios       u  ON tr.id_usuario     = u.id_usuario
  ORDER BY e.fecha_despacho DESC
`, 'Error al obtener entregas'))

module.exports = router
