const express = require('express')
const { conectar } = require('../db')
const verificarToken = require('../middleware/auth')
const { ROLES, permitirRoles } = require('../middleware/roles')
const { conMensajeDeError } = require('../middleware/errores')

const router = express.Router()
router.use(verificarToken)
router.use(permitirRoles(ROLES.ADMIN))

function cargarDatosProveedor(request, body) {
  return request
    .input('nombre',          body.nombre)
    .input('cuit',            body.cuit)
    .input('direccion',       body.direccion       || null)
    .input('ciudad',          body.ciudad          || null)
    .input('provincia',       body.provincia       || null)
    .input('telefono',        body.telefono        || null)
    .input('email',           body.email           || null)
    .input('contacto_nombre', body.contacto_nombre || null)
}

router.get('/', conMensajeDeError('Error al obtener proveedores', async (req, res) => {
  const pool = await conectar()
  const resultado = await pool.request().query(`
    SELECT id_proveedor, nombre, cuit, direccion, ciudad, provincia,
           telefono, email, contacto_nombre, activo, fecha_alta
    FROM Proveedores
    ORDER BY nombre
  `)
  res.json(resultado.recordset)
}))

router.post('/', conMensajeDeError('Error al crear proveedor', async (req, res) => {
  const { nombre, cuit } = req.body

  if (!nombre || !cuit) {
    return res.status(400).json({ error: 'Nombre y CUIT son obligatorios' })
  }

  const pool = await conectar()
  await cargarDatosProveedor(pool.request(), req.body).query(`
    INSERT INTO Proveedores (nombre, cuit, direccion, ciudad, provincia, telefono, email, contacto_nombre, activo, fecha_alta)
    VALUES (@nombre, @cuit, @direccion, @ciudad, @provincia, @telefono, @email, @contacto_nombre, 1, GETDATE())
  `)
  res.status(201).json({ mensaje: 'Proveedor creado' })
}, 'Ya existe un proveedor con ese CUIT.'))

router.put('/:id', conMensajeDeError('Error al actualizar proveedor', async (req, res) => {
  const pool = await conectar()
  const request = pool.request().input('id', parseInt(req.params.id))

  await cargarDatosProveedor(request, req.body).query(`
    UPDATE Proveedores
    SET nombre = @nombre, cuit = @cuit, direccion = @direccion,
        ciudad = @ciudad, provincia = @provincia, telefono = @telefono,
        email = @email, contacto_nombre = @contacto_nombre
    WHERE id_proveedor = @id
  `)
  res.json({ mensaje: 'Proveedor actualizado' })
}))

router.patch('/:id/toggle', conMensajeDeError('Error al cambiar estado', async (req, res) => {
  const pool = await conectar()
  await pool.request()
    .input('id', parseInt(req.params.id))
    .query(`
      UPDATE Proveedores
      SET activo = CASE WHEN activo = 1 THEN 0 ELSE 1 END
      WHERE id_proveedor = @id
    `)
  res.json({ mensaje: 'Estado actualizado' })
}))

module.exports = router
