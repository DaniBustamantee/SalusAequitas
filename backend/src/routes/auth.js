const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { conectar } = require('../db')
const { conMensajeDeError } = require('../middleware/errores')

const router = express.Router()

const SALT_ROUNDS = 10
const LARGO_MINIMO_PASSWORD = 6

router.post('/login', conMensajeDeError('Error interno del servidor', async (req, res) => {
  const { email, password } = req.body

  const pool = await conectar()

  const resultado = await pool.request()
    .input('email', email)
    .query(`
      SELECT u.id_usuario, u.nombre, u.apellido, u.email,
             u.password_hash, u.activo, u.id_rol, r.nombre_rol,
             c.fecha_aprobacion
      FROM Usuarios u
      INNER JOIN Roles r ON u.id_rol = r.id_rol
      LEFT  JOIN Clientes c ON c.id_usuario = u.id_usuario
      WHERE u.email = @email
    `)

  const usuario = resultado.recordset[0]
  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  if (!usuario.activo) {
    const esClientePendiente = usuario.nombre_rol === 'Cliente' && usuario.fecha_aprobacion === null
    if (esClientePendiente) {
      return res.status(403).json({
        error: 'Tu cuenta está pendiente de aprobación. El administrador la activará pronto.',
      })
    }
    return res.status(403).json({ error: 'Usuario inactivo. Contactá al administrador.' })
  }

  const passwordCorrecta = await bcrypt.compare(password, usuario.password_hash)
  if (!passwordCorrecta) {
    return res.status(401).json({ error: 'Credenciales incorrectas' })
  }

  const token = jwt.sign(
    { id: usuario.id_usuario, rol: usuario.nombre_rol },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  )

  res.json({
    token,
    usuario: {
      id: usuario.id_usuario,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.nombre_rol,
    },
  })
}))

router.post('/registro', conMensajeDeError('Error al registrar la cuenta. Intentá de nuevo.', async (req, res) => {
  const { nombre, apellido, razon_social, cuit, email, password, telefono, direccion, ciudad, provincia } = req.body

  const faltanDatos =
    !nombre?.trim() || !apellido?.trim() || !razon_social?.trim() ||
    !cuit?.trim() || !email?.trim() || !password || !ciudad?.trim()

  if (faltanDatos) {
    return res.status(400).json({ error: 'Completá todos los campos obligatorios.' })
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'El correo electrónico no es válido.' })
  }
  if (password.length < LARGO_MINIMO_PASSWORD) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' })
  }

  const pool = await conectar()

  const existeEmail = await pool.request()
    .input('email', email.trim())
    .query('SELECT id_usuario FROM Usuarios WHERE email = @email')

  if (existeEmail.recordset.length > 0) {
    return res.status(409).json({ error: 'Ya existe una cuenta registrada con ese correo electrónico.' })
  }

  const existeCuit = await pool.request()
    .input('cuit', cuit.trim())
    .query('SELECT id_cliente FROM Clientes WHERE cuit = @cuit')

  if (existeCuit.recordset.length > 0) {
    return res.status(409).json({ error: 'Ya existe una cuenta registrada con ese CUIT.' })
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  const nuevoUsuario = await pool.request()
    .input('nombre', nombre.trim())
    .input('apellido', apellido.trim())
    .input('email', email.trim())
    .input('hash', passwordHash)
    .query(`
      INSERT INTO Usuarios (id_rol, nombre, apellido, email, password_hash, activo, fecha_registro)
      OUTPUT INSERTED.id_usuario
      VALUES (
        (SELECT id_rol FROM Roles WHERE nombre_rol = 'Cliente'),
        @nombre, @apellido, @email, @hash, 0, GETDATE()
      )
    `)

  const idUsuario = nuevoUsuario.recordset[0].id_usuario

  await pool.request()
    .input('id_usuario', idUsuario)
    .input('razon_social', razon_social.trim())
    .input('cuit', cuit.trim())
    .input('telefono', telefono?.trim() || null)
    .input('direccion', direccion?.trim() || null)
    .input('ciudad', ciudad.trim())
    .input('provincia', provincia?.trim() || null)
    .query(`
      INSERT INTO Clientes (id_usuario, id_zona, razon_social, cuit, direccion, ciudad, provincia, telefono, activo, fecha_alta)
      VALUES (@id_usuario, NULL, @razon_social, @cuit, @direccion, @ciudad, @provincia, @telefono, 0, GETDATE())
    `)

  res.status(201).json({ mensaje: 'Tu cuenta fue creada correctamente. El administrador la activará pronto.' })
}))

module.exports = router
