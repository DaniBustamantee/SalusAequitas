const express = require('express')
const { conectar } = require('../db')
const verificarToken = require('../middleware/auth')
const { ROLES, permitirRoles } = require('../middleware/roles')
const { conMensajeDeError } = require('../middleware/errores')

const router = express.Router()
router.use(verificarToken)

function cargarDatosInsumo(request, body) {
  return request
    .input('nombre', body.nombre)
    .input('descripcion', body.descripcion || null)
    .input('unidad_medida', body.unidad_medida)
    .input('stock_actual', Number(body.stock_actual) || 0)
    .input('stock_minimo', Number(body.stock_minimo) || 0)
    .input('id_proveedor', body.id_proveedor ? Number(body.id_proveedor) : null)
    .input('costo_unitario', Number(body.costo_unitario) || 0)
}

router.get('/', permitirRoles(ROLES.ADMIN, ROLES.OPERARIO), conMensajeDeError('Error al obtener insumos', async (req, res) => {
  const { tipo } = req.query

  const pool = await conectar()
  const request = pool.request()

  let filtroTipo = ''
  if (tipo) {
    request.input('tipo', tipo)
    filtroTipo = 'AND i.tipo = @tipo'
  }

  const resultado = await request.query(`
    SELECT i.id_insumo, i.id_proveedor, i.nombre, i.descripcion,
           i.unidad_medida, i.stock_actual, i.stock_minimo, i.activo,
           i.tipo, i.costo_unitario,
           p.nombre AS proveedor
    FROM Insumos i
    LEFT JOIN Proveedores p ON i.id_proveedor = p.id_proveedor
    WHERE 1=1 ${filtroTipo}
    ORDER BY i.nombre
  `)
  res.json(resultado.recordset)
}))

router.post('/', permitirRoles(ROLES.ADMIN), conMensajeDeError('Error al crear insumo', async (req, res) => {
  const { nombre, unidad_medida, tipo } = req.body

  if (!nombre || !unidad_medida) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' })
  }

  const tipoFinal = tipo === 'materia_prima' ? 'materia_prima' : 'insumo'

  const pool = await conectar()
  await cargarDatosInsumo(pool.request(), req.body)
    .input('tipo', tipoFinal)
    .query(`
      INSERT INTO Insumos (nombre, descripcion, unidad_medida, stock_actual, stock_minimo, id_proveedor, activo, tipo, costo_unitario)
      VALUES (@nombre, @descripcion, @unidad_medida, @stock_actual, @stock_minimo, @id_proveedor, 1, @tipo, @costo_unitario)
    `)
  res.status(201).json({ mensaje: 'Insumo creado' })
}, 'Ya existe un insumo con ese nombre.'))

router.put('/:id', permitirRoles(ROLES.ADMIN), conMensajeDeError('Error al actualizar insumo', async (req, res) => {
  const pool = await conectar()
  const request = pool.request().input('id', parseInt(req.params.id))

  await cargarDatosInsumo(request, req.body).query(`
    UPDATE Insumos
    SET nombre = @nombre, descripcion = @descripcion, unidad_medida = @unidad_medida,
        stock_actual = @stock_actual, stock_minimo = @stock_minimo,
        id_proveedor = @id_proveedor, costo_unitario = @costo_unitario
    WHERE id_insumo = @id
  `)
  res.json({ mensaje: 'Insumo actualizado' })
}))

router.patch('/:id/toggle', permitirRoles(ROLES.ADMIN), conMensajeDeError('Error al cambiar estado', async (req, res) => {
  const pool = await conectar()
  await pool.request()
    .input('id', parseInt(req.params.id))
    .query(`
      UPDATE Insumos
      SET activo = CASE WHEN activo = 1 THEN 0 ELSE 1 END
      WHERE id_insumo = @id
    `)
  res.json({ mensaje: 'Estado actualizado' })
}))

module.exports = router
