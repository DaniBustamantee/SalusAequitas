const express = require('express')
const { conectar } = require('../db')
const verificarToken = require('../middleware/auth')
const { ROLES, permitirRoles } = require('../middleware/roles')
const { resetearPassword } = require('../utils/funciones')
const { conMensajeDeError } = require('../middleware/errores')

const router = express.Router()
router.use(verificarToken)
router.use(permitirRoles(ROLES.ADMIN))

async function buscarUsuarioDelCliente(pool, idCliente) {
  const resultado = await pool.request()
    .input('id', idCliente)
    .query('SELECT id_usuario, activo FROM Clientes WHERE id_cliente = @id')
  return resultado.recordset[0] || null
}

router.get('/', conMensajeDeError('Error al obtener clientes', async (req, res) => {
  const pool = await conectar()
  const resultado = await pool.request().query(`
    SELECT
      c.id_cliente, c.id_usuario, c.id_zona,
      c.razon_social, c.cuit, c.direccion,
      c.ciudad, c.provincia, c.telefono,
      c.activo, c.fecha_alta, c.fecha_aprobacion, c.notas_internas,
      u.email, u.nombre AS nombre_usuario, u.apellido AS apellido_usuario,
      z.nombre AS zona
    FROM Clientes c
    INNER JOIN Usuarios u ON c.id_usuario = u.id_usuario
    LEFT  JOIN Zonas    z ON c.id_zona    = z.id_zona
    ORDER BY c.razon_social
  `)
  res.json(resultado.recordset)
}))

router.get('/:id/pedidos', conMensajeDeError('Error al obtener pedidos del cliente', async (req, res) => {
  const pool = await conectar()
  const resultado = await pool.request()
    .input('id', parseInt(req.params.id))
    .query(`
      SELECT
        p.id_pedido, p.nro_pedido,
        p.total_unidades, p.ciudad_entrega,
        ep.nombre AS estado,
        CONVERT(VARCHAR(10), p.fecha_pedido, 23) AS fecha_pedido_fmt
      FROM Pedidos p
      JOIN Clientes       c  ON p.id_cliente = c.id_cliente
      JOIN Estados_Pedido ep ON p.id_estado  = ep.id_estado
      WHERE c.id_cliente = @id
      ORDER BY p.fecha_pedido DESC
    `)
  res.json(resultado.recordset)
}))

router.post('/', conMensajeDeError('Error al crear cliente', async (req, res) => {
  const { razon_social, cuit, direccion, ciudad, provincia, telefono, id_zona, email } = req.body

  if (!razon_social || !cuit || !ciudad || !email) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  const pool = await conectar()

  const existeEmail = await pool.request()
    .input('email', email)
    .query('SELECT id_usuario FROM Usuarios WHERE email = @email')

  if (existeEmail.recordset.length > 0) {
    return res.status(409).json({ error: 'Ya existe un usuario con ese email.' })
  }

  const nuevoUsuario = await pool.request()
    .input('email', email)
    .input('nombre', razon_social)
    .query(`
      INSERT INTO Usuarios (id_rol, nombre, apellido, email, password_hash, activo, fecha_registro)
      OUTPUT INSERTED.id_usuario
      VALUES (
        (SELECT id_rol FROM Roles WHERE nombre_rol = 'Cliente'),
        @nombre, '', @email, 'PENDIENTE', 1, GETDATE()
      )
    `)

  const idUsuario = nuevoUsuario.recordset[0].id_usuario

  await pool.request()
    .input('id_usuario', idUsuario)
    .input('id_zona', id_zona || null)
    .input('razon_social', razon_social)
    .input('cuit', cuit)
    .input('direccion', direccion || null)
    .input('ciudad', ciudad)
    .input('provincia', provincia || null)
    .input('telefono', telefono || null)
    .query(`
      INSERT INTO Clientes (id_usuario, id_zona, razon_social, cuit, direccion, ciudad, provincia, telefono, activo, fecha_alta, fecha_aprobacion)
      VALUES (@id_usuario, @id_zona, @razon_social, @cuit, @direccion, @ciudad, @provincia, @telefono, 1, GETDATE(), GETDATE())
    `)

  res.status(201).json({ mensaje: 'Cliente creado correctamente' })
}, 'Ya existe un cliente con ese CUIT.'))

router.put('/:id', conMensajeDeError('Error al actualizar cliente', async (req, res) => {
  const { razon_social, cuit, direccion, ciudad, provincia, telefono, id_zona } = req.body

  const pool = await conectar()
  await pool.request()
    .input('id', parseInt(req.params.id))
    .input('razon_social', razon_social)
    .input('cuit', cuit)
    .input('direccion', direccion || null)
    .input('ciudad', ciudad)
    .input('provincia', provincia || null)
    .input('telefono', telefono || null)
    .input('id_zona', id_zona || null)
    .query(`
      UPDATE Clientes
      SET razon_social = @razon_social,
          cuit         = @cuit,
          direccion    = @direccion,
          ciudad       = @ciudad,
          provincia    = @provincia,
          telefono     = @telefono,
          id_zona      = @id_zona
      WHERE id_cliente = @id
    `)
  res.json({ mensaje: 'Cliente actualizado' })
}))

router.patch('/:id/notas', conMensajeDeError('Error al guardar notas', async (req, res) => {
  const { notas_internas } = req.body

  const pool = await conectar()
  await pool.request()
    .input('id', parseInt(req.params.id))
    .input('notas_internas', notas_internas || null)
    .query('UPDATE Clientes SET notas_internas = @notas_internas WHERE id_cliente = @id')
  res.json({ mensaje: 'Notas guardadas' })
}))

router.patch('/:id/aprobar', conMensajeDeError('Error al aprobar cliente', async (req, res) => {
  const idCliente = parseInt(req.params.id)

  const pool = await conectar()

  const cliente = await buscarUsuarioDelCliente(pool, idCliente)
  if (!cliente) {
    return res.status(404).json({ error: 'Cliente no encontrado' })
  }

  await pool.request()
    .input('id', idCliente)
    .query(`
      UPDATE Clientes
      SET activo = 1, fecha_aprobacion = GETDATE()
      WHERE id_cliente = @id
    `)

  await pool.request()
    .input('id_usuario', cliente.id_usuario)
    .query('UPDATE Usuarios SET activo = 1 WHERE id_usuario = @id_usuario')

  res.json({ mensaje: 'Cliente aprobado correctamente' })
}))

router.patch('/:id/toggle', conMensajeDeError('Error al cambiar estado', async (req, res) => {
  const idCliente = parseInt(req.params.id)

  const pool = await conectar()

  const cliente = await buscarUsuarioDelCliente(pool, idCliente)
  if (!cliente) {
    return res.status(404).json({ error: 'Cliente no encontrado' })
  }

  const nuevoEstado = cliente.activo ? 0 : 1

  await pool.request()
    .input('id', idCliente)
    .input('activo', nuevoEstado)
    .query('UPDATE Clientes SET activo = @activo WHERE id_cliente = @id')

  await pool.request()
    .input('id_usuario', cliente.id_usuario)
    .input('activo', nuevoEstado)
    .query('UPDATE Usuarios SET activo = @activo WHERE id_usuario = @id_usuario')

  res.json({ mensaje: 'Estado actualizado' })
}))

router.patch('/:id/reset-password', conMensajeDeError('Error al resetear contraseña', async (req, res) => {
  const pool = await conectar()

  const cliente = await buscarUsuarioDelCliente(pool, parseInt(req.params.id))
  if (!cliente) {
    return res.status(404).json({ error: 'Cliente no encontrado' })
  }

  const passwordTemporal = await resetearPassword(pool, cliente.id_usuario)
  res.json({ mensaje: 'Contraseña reseteada', password_temporal: passwordTemporal })
}))

module.exports = router
