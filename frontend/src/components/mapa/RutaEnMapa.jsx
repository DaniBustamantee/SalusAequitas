import { useEffect, useRef } from "react"
import { useMap } from "react-leaflet"
import L from "leaflet"
import { fetchAuth, API_URL } from "../../services/fetchAuth"

export default function RutaEnMapa({ puntos, color, alEncontrarRuta }) {
  const mapa = useMap()
  const alEncontrarRutaRef = useRef(alEncontrarRuta)
  const clave = puntos.map(([lat, lng]) => `${lat},${lng}`).join("|")

  useEffect(() => {
    alEncontrarRutaRef.current = alEncontrarRuta
  })

  useEffect(() => {
    const coordenadas = clave.split("|").map((par) => {
      const [lat, lng] = par.split(",").map(Number)
      return [lng, lat]
    })
    if (coordenadas.length < 2) return

    let linea = null
    let cancelado = false

    fetchAuth(`${API_URL}/rutas/trazado`, {
      method: "POST",
      body: JSON.stringify({ coordenadas }),
    })
      .then((res) => res.json())
      .then((datos) => {
        const recorrido = datos.features?.[0]
        if (cancelado || !recorrido) return

        const latLngs = recorrido.geometry.coordinates.map(([lng, lat]) => [lat, lng])
        linea = L.polyline(latLngs, { color, weight: 5, opacity: 0.85 }).addTo(mapa)
        mapa.fitBounds(linea.getBounds(), { padding: [50, 50] })

        const { distance, duration } = recorrido.properties.summary
        alEncontrarRutaRef.current?.({
          distancia: Math.round(distance / 1000),
          duracion: Math.round(duration / 60),
        })
      })
      .catch(() => {})

    return () => {
      cancelado = true
      if (linea) mapa.removeLayer(linea)
    }
  }, [clave, color, mapa])

  return null
}
