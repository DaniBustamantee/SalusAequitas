const express = require('express')
const { conectar } = require('../db')
const verificarToken = require('../middleware/auth')
const { ROLES, permitirRoles } = require('../middleware/roles')
const { conMensajeDeError } = require('../middleware/errores')

const router = express.Router()
router.use(verificarToken)

const ESTADOS_CERRADOS = '7, 8'

function cargarDatosProducto(request, body) {
  return request
    .input('nombre', body.nombre)
    .input('codigo', body.codigo)
    .input('descripcion', body.descripcion || null)
    .input('precio_unitario', Number(body.precio_unitario) || 0)
    .input('stock_actual', Number(body.stock_actual) || 0)
    .input('stock_minimo', Number(body.stock_minimo) || 0)
    .input('stock_critico', Number(body.stock_critico) || 0)
}

router.get('/', permitirRoles(ROLES.ADMIN, ROLES.CLIENTE, ROLES.OPERARIO), conMensajeDeError('Error al obtener productos', async (req, res) => {
  const pool = await conectar()
  const resultado = await pool.request().query(`
    SELECT id_producto, nombre, codigo, descripcion, precio_unitario,
           stock_actual, stock_minimo, stock_critico, activo, imagen_url
    FROM Productos
    ORDER BY nombre
  `)
  res.json(resultado.recordset)
}))

router.post('/', permitirRoles(ROLES.ADMIN), conMensajeDeError('Error al crear producto', async (req, res) => {
  const { nombre, codigo } = req.body

  if (!nombre || !codigo) {
    return res.status(400).json({ error: 'Nombre y código son obligatorios' })
  }

  const pool = await conectar()
  await cargarDatosProducto(pool.request(), req.body).query(`
    INSERT INTO Productos (nombre, codigo, descripcion, precio_unitario, stock_actual, stock_minimo, stock_critico, activo, fecha_creacion)
    VALUES (@nombre, @codigo, @descripcion, @precio_unitario, @stock_actual, @stock_minimo, @stock_critico, 1, GETDATE())
  `)
  res.status(201).json({ mensaje: 'Producto creado' })
}, 'Ya existe un producto con ese código.'))

router.put('/:id', permitirRoles(ROLES.ADMIN), conMensajeDeError('Error al actualizar producto', async (req, res) => {
  const pool = await conectar()
  const request = pool.request().input('id', parseInt(req.params.id))

  await cargarDatosProducto(request, req.body).query(`
    UPDATE Productos
    SET nombre = @nombre, codigo = @codigo, descripcion = @descripcion,
        precio_unitario = @precio_unitario, stock_actual = @stock_actual,
        stock_minimo = @stock_minimo, stock_critico = @stock_critico
    WHERE id_producto = @id
  `)
  res.json({ mensaje: 'Producto actualizado' })
}))

router.patch('/:id/toggle', permitirRoles(ROLES.ADMIN), conMensajeDeError('Error al cambiar estado', async (req, res) => {
  const pool = await conectar()
  const id = parseInt(req.params.id)

  const resProducto = await pool.request()
    .input('id', id)
    .query('SELECT activo FROM Productos WHERE id_producto = @id')

  if (resProducto.recordset.length === 0) {
    return res.status(404).json({ error: 'Producto no encontrado' })
  }

  if (resProducto.recordset[0].activo) {
    const resPedidos = await pool.request()
      .input('id', id)
      .query(`
        SELECT COUNT(*) AS total
        FROM Items_Pedido ip
        JOIN Pedidos p ON ip.id_pedido = p.id_pedido
        WHERE ip.id_producto = @id
          AND p.id_estado NOT IN (${ESTADOS_CERRADOS})
      `)

    const pedidosActivos = resPedidos.recordset[0].total
    if (pedidosActivos > 0) {
      return res.status(400).json({
        error: `No se puede desactivar: el producto está incluido en ${pedidosActivos} pedido(s) activo(s).`,
      })
    }
  }

  await pool.request()
    .input('id', id)
    .query(`
      UPDATE Productos
      SET activo = CASE WHEN activo = 1 THEN 0 ELSE 1 END
      WHERE id_producto = @id
    `)
  res.json({ mensaje: 'Estado actualizado' })
}))

module.exports = router
