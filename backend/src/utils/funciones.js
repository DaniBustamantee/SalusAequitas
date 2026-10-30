const bcrypt = require('bcryptjs')

const CODIGOS_DUPLICADO = [2627, 2601]

function esClaveDuplicada(error) {
  return CODIGOS_DUPLICADO.includes(error.number)
}

function generarNumero(prefijo, id) {
  return `${prefijo}-${String(id).padStart(4, '0')}`
}

function agruparPor(filas, campo, transformar = (fila) => fila) {
  const grupos = {}
  for (const fila of filas) {
    const clave = fila[campo]
    if (!grupos[clave]) grupos[clave] = []
    grupos[clave].push(transformar(fila))
  }
  return grupos
}

const SQL_RESULTADO_ENTREGA = `
  CASE
    WHEN LOWER(ISNULL(e.resultado_entrega,'')) IN ('entregado','completo') THEN 'Entregado'
    WHEN LOWER(ISNULL(e.resultado_entrega,'')) = 'fallido'  THEN 'Fallido'
    WHEN LOWER(ISNULL(e.resultado_entrega,'')) = 'parcial'  THEN 'Parcial'
    ELSE NULL
  END AS resultado_entrega`

async function buscarIdCliente(pool, idUsuario) {
  const resultado = await pool.request()
    .input('id_usuario', idUsuario)
    .query('SELECT id_cliente FROM Clientes WHERE id_usuario = @id_usuario')
  return resultado.recordset[0]?.id_cliente ?? null
}

async function buscarIdTransportista(pool, idUsuario) {
  const resultado = await pool.request()
    .input('id_usuario', idUsuario)
    .query('SELECT id_transportista FROM Transportistas WHERE id_usuario = @id_usuario')
  return resultado.recordset[0]?.id_transportista ?? null
}

const PASSWORD_TEMPORAL = 'Vitabiosa2024!'

async function resetearPassword(pool, idUsuario) {
  const passwordHash = await bcrypt.hash(PASSWORD_TEMPORAL, 10)
  await pool.request()
    .input('hash', passwordHash)
    .input('id_usuario', idUsuario)
    .query('UPDATE Usuarios SET password_hash = @hash WHERE id_usuario = @id_usuario')
  return PASSWORD_TEMPORAL
}

async function registrarCambioEstado(pool, { idPedido, idEstado, idUsuario, observacion }) {
  await pool.request()
    .input('id_pedido', idPedido)
    .input('id_estado', idEstado)
    .input('cambiado_por', idUsuario)
    .input('observacion', observacion)
    .query(`
      INSERT INTO Historial_Estados_Pedido (id_pedido, id_estado, cambiado_por, observacion)
      VALUES (@id_pedido, @id_estado, @cambiado_por, @observacion)
    `)
}

async function registrarMovimientoStock(pool, mov) {
  await pool.request()
    .input('tipo_entidad', mov.tipoEntidad)
    .input('id_entidad', mov.idEntidad)
    .input('nombre_entidad', mov.nombreEntidad)
    .input('tipo_movimiento', mov.tipoMovimiento)
    .input('cantidad', mov.cantidad)
    .input('stock_anterior', mov.stockAnterior)
    .input('stock_nuevo', mov.stockNuevo)
    .input('id_usuario', mov.idUsuario)
    .input('referencia', mov.referencia)
    .query(`
      INSERT INTO Movimientos_Stock
        (tipo_entidad, id_entidad, nombre_entidad, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, id_usuario, referencia)
      VALUES
        (@tipo_entidad, @id_entidad, @nombre_entidad, @tipo_movimiento, @cantidad, @stock_anterior, @stock_nuevo, @id_usuario, @referencia)
    `)
}

module.exports = {
  esClaveDuplicada,
  generarNumero,
  agruparPor,
  SQL_RESULTADO_ENTREGA,
  buscarIdCliente,
  buscarIdTransportista,
  resetearPassword,
  registrarCambioEstado,
  registrarMovimientoStock,
}
