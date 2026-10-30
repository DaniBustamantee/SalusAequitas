const express = require('express')
const { conectar } = require('../db')
const verificarToken = require('../middleware/auth')
const { ROLES, permitirRoles } = require('../middleware/roles')
const { conMensajeDeError } = require('../middleware/errores')

const router = express.Router()
router.use(verificarToken)
router.use(permitirRoles(ROLES.ADMIN))

router.get('/', conMensajeDeError('Error al obtener zonas', async (req, res) => {
  const pool = await conectar()
  const resultado = await pool.request().query(`
    SELECT id_zona, nombre, provincia, descripcion, activa
    FROM Zonas
    ORDER BY provincia, nombre
  `)
  res.json(resultado.recordset)
}))

router.post('/', conMensajeDeError('Error al crear zona', async (req, res) => {
  const { nombre, provincia, descripcion } = req.body

  if (!nombre || !provincia) {
    return res.status(400).json({ error: 'Nombre y provincia son obligatorios' })
  }

  const pool = await conectar()
  await pool.request()
    .input('nombre', nombre)
    .input('provincia', provincia)
    .input('descripcion', descripcion || null)
    .query(`
      INSERT INTO Zonas (nombre, provincia, descripcion, activa)
      VALUES (@nombre, @provincia, @descripcion, 1)
    `)
  res.status(201).json({ mensaje: 'Zona creada' })
}))

router.put('/:id', conMensajeDeError('Error al actualizar zona', async (req, res) => {
  const { nombre, provincia, descripcion } = req.body

  const pool = await conectar()
  await pool.request()
    .input('id', parseInt(req.params.id))
    .input('nombre', nombre)
    .input('provincia', provincia || null)
    .input('descripcion', descripcion || null)
    .query(`
      UPDATE Zonas
      SET nombre = @nombre, provincia = @provincia, descripcion = @descripcion
      WHERE id_zona = @id
    `)
  res.json({ mensaje: 'Zona actualizada' })
}))

router.patch('/:id/toggle', conMensajeDeError('Error al cambiar estado', async (req, res) => {
  const pool = await conectar()
  await pool.request()
    .input('id', parseInt(req.params.id))
    .query(`
      UPDATE Zonas
      SET activa = CASE WHEN activa = 1 THEN 0 ELSE 1 END
      WHERE id_zona = @id
    `)
  res.json({ mensaje: 'Estado actualizado' })
}))

module.exports = router
