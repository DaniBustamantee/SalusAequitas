const express = require('express')
const verificarToken = require('../middleware/auth')
const { ROLES, permitirRoles } = require('../middleware/roles')
const { conMensajeDeError } = require('../middleware/errores')

const router = express.Router()
router.use(verificarToken)
router.use(permitirRoles(ROLES.TRANSPORTISTA))

const ORS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson'

function esPuntoValido(punto) {
  return Array.isArray(punto) && punto.length === 2 && punto.every(Number.isFinite)
}

router.post('/trazado', conMensajeDeError('Error al calcular la ruta', async (req, res) => {
  const { coordenadas } = req.body

  if (!Array.isArray(coordenadas) || coordenadas.length < 2 || !coordenadas.every(esPuntoValido)) {
    return res.status(400).json({ error: 'Se necesitan al menos dos puntos válidos' })
  }

  const respuesta = await fetch(ORS_URL, {
    method: 'POST',
    headers: {
      Authorization: process.env.ORS_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ coordinates: coordenadas }),
  })

  const datos = await respuesta.json()
  res.status(respuesta.status).json(datos)
}))

module.exports = router
