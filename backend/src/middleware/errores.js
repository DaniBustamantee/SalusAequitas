const { esClaveDuplicada } = require('../utils/funciones')

function conMensajeDeError(mensaje, handler, mensajeDuplicado = null) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next)
    } catch (error) {
      error.mensaje = mensaje
      error.mensajeDuplicado = mensajeDuplicado
      next(error)
    }
  }
}

function manejarErrores(error, req, res, next) {
  console.error(error)
  if (error.mensajeDuplicado && esClaveDuplicada(error)) {
    return res.status(409).json({ error: error.mensajeDuplicado })
  }
  res.status(500).json({ error: error.mensaje || 'Error interno del servidor' })
}

module.exports = { conMensajeDeError, manejarErrores }
