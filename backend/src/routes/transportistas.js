const express = require('express')
const { conectar } = require('../db')
const verificarToken = require('../middleware/auth')
const { ROLES, permitirRoles } = require('../middleware/roles')
const { resetearPassword } = require('../utils/funciones')
const { conMensajeDeError } = require('../middleware/errores')

const router = express.Router()
router.use(verificarToken)
router.use(permitirRoles(ROLES.ADMIN))

async function asignarZonas(pool, idTransportista, zonas) {
  if (!Array.isArray(zonas) || zonas.length === 0) return

  for (const idZona of zonas) {
    await pool.request()
      .input('id_transportista', idTransportista)
      .input('id_zona', idZona)
      .query(`
        INSERT INTO Transportistas_Zonas (id_transportista, id_zona, fecha_asignacion)
        VALUES (@id_transportista, @id_zona, GETDATE())
      `)
  }
}

router.get('/', conMensajeDeError('Error al obtener transportistas', async (req, res) => {
  const pool = await conectar()
  const resultado = await pool.request().query(`
    SELECT
      t.id_transportista, t.dni, t.nro_licencia, t.tipo_vehiculo,
      t.patente, t.activo, t.fecha_alta,
      u.nombre, u.apellido, u.email,
      STRING_AGG(CAST(tz.id_zona AS VARCHAR), ',') AS zonas_ids
    FROM Transportistas t
    INNER JOIN Usuarios u ON t.id_usuario = u.id_usuario
    LEFT  JOIN Transportistas_Zonas tz ON t.id_transportista = tz.id_transportista
    GROUP BY t.id_transportista, t.dni, t.nro_licencia, t.tipo_vehiculo,
             t.patente, t.activo, t.fecha_alta, u.nombre, u.apellido, u.email
    ORDER BY u.apellido, u.nombre
  `)

  const transportistas = resultado.recordset.map((fila) => ({
    ...fila,
    zonas: fila.zonas_ids ? fila.zonas_ids.split(',').map(Number) : [],
  }))

  res.json(transportistas)
}))

router.post('/', conMensajeDeError('Error al crear transportista', async (req, res) => {
  const { nombre, apellido, email, dni, nro_licencia, tipo_vehiculo, patente, zonas } = req.body

  if (!nombre || !apellido || !email || !dni || !nro_licencia || !patente) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  const pool = await conectar()

  const nuevoUsuario = await pool.request()
    .input('nombre', nombre)
    .input('apellido', apellido)
    .input('email', email)
    .query(`
      INSERT INTO Usuarios (id_rol, nombre, apellido, email, password_hash, activo, fecha_registro)
      OUTPUT INSERTED.id_usuario
      VALUES (
        (SELECT id_rol FROM Roles WHERE nombre_rol = 'Transportista'),
        @nombre, @apellido, @email, 'PENDIENTE', 1, GETDATE()
      )
    `)

  const idUsuario = nuevoUsuario.recordset[0].id_usuario

  const nuevoTransportista = await pool.request()
    .input('id_usuario', idUsuario)
    .input('dni', dni)
    .input('nro_licencia', nro_licencia)
    .input('tipo_vehiculo', tipo_vehiculo || '')
    .input('patente', patente)
    .query(`
      INSERT INTO Transportistas (id_usuario, dni, nro_licencia, tipo_vehiculo, patente, activo, fecha_alta)
      OUTPUT INSERTED.id_transportista
      VALUES (@id_usuario, @dni, @nro_licencia, @tipo_vehiculo, @patente, 1, GETDATE())
    `)

  await asignarZonas(pool, nuevoTransportista.recordset[0].id_transportista, zonas)

  res.status(201).json({ mensaje: 'Transportista creado correctamente' })
}))

router.put('/:id', conMensajeDeError('Error al actualizar transportista', async (req, res) => {
  const { dni, nro_licencia, tipo_vehiculo, patente, zonas } = req.body
  const idTransportista = parseInt(req.params.id)

  const pool = await conectar()

  await pool.request()
    .input('id', idTransportista)
    .input('dni', dni)
    .input('nro_licencia', nro_licencia)
    .input('tipo_vehiculo', tipo_vehiculo || '')
    .input('patente', patente)
    .query(`
      UPDATE Transportistas
      SET dni = @dni, nro_licencia = @nro_licencia,
          tipo_vehiculo = @tipo_vehiculo, patente = @patente
      WHERE id_transportista = @id
    `)

  await pool.request()
    .input('id', idTransportista)
    .query('DELETE FROM Transportistas_Zonas WHERE id_transportista = @id')

  await asignarZonas(pool, idTransportista, zonas)

  res.json({ mensaje: 'Transportista actualizado' })
}))

router.patch('/:id/toggle', conMensajeDeError('Error al cambiar estado', async (req, res) => {
  const pool = await conectar()
  const idTransportista = parseInt(req.params.id)

  const resTransportista = await pool.request()
    .input('id', idTransportista)
    .query('SELECT activo FROM Transportistas WHERE id_transportista = @id')

  if (resTransportista.recordset.length === 0) {
    return res.status(404).json({ error: 'Transportista no encontrado' })
  }

  if (resTransportista.recordset[0].activo) {
    const resEnvios = await pool.request()
      .input('id', idTransportista)
      .query(`
        SELECT COUNT(*) AS total
        FROM Envios e
        JOIN Pedidos p ON e.id_pedido = p.id_pedido
        WHERE e.id_transportista = @id
          AND p.id_estado NOT IN (7, 8)
      `)

    const enviosActivos = resEnvios.recordset[0].total
    if (enviosActivos > 0) {
      return res.status(400).json({
        error: `No se puede desactivar: el transportista tiene ${enviosActivos} envío(s) activo(s) pendiente(s) de entrega.`,
      })
    }
  }

  await pool.request()
    .input('id', idTransportista)
    .query(`
      UPDATE Transportistas
      SET activo = CASE WHEN activo = 1 THEN 0 ELSE 1 END
      WHERE id_transportista = @id
    `)
  res.json({ mensaje: 'Estado actualizado' })
}))

router.patch('/:id/reset-password', conMensajeDeError('Error al resetear contraseña', async (req, res) => {
  const pool = await conectar()
  const resTransportista = await pool.request()
    .input('id', parseInt(req.params.id))
    .query('SELECT id_usuario FROM Transportistas WHERE id_transportista = @id')

  const transportista = resTransportista.recordset[0]
  if (!transportista) {
    return res.status(404).json({ error: 'Transportista no encontrado' })
  }

  const passwordTemporal = await resetearPassword(pool, transportista.id_usuario)
  res.json({ mensaje: 'Contraseña reseteada', password_temporal: passwordTemporal })
}))

module.exports = router
