import { useState, useEffect, useCallback, useRef } from "react"
import { fetchAuth } from "../services/fetchAuth"

export function useCargarDatos(urls, alFallar) {
  const [datos, setDatos] = useState(() => urls.map(() => []))
  const [cargando, setCargando] = useState(true)
  const alFallarRef = useRef(alFallar)
  const clave = urls.join("|")

  useEffect(() => {
    alFallarRef.current = alFallar
  })

  const recargar = useCallback(async () => {
    try {
      const respuestas = await Promise.all(clave.split("|").map((url) => fetchAuth(url)))
      const contenido = await Promise.all(respuestas.map((r) => r.json()))
      setDatos(contenido.map((lista) => (Array.isArray(lista) ? lista : [])))
    } catch {
      if (alFallarRef.current) alFallarRef.current()
      else setDatos((anteriores) => [[], ...anteriores.slice(1)])
    } finally {
      setCargando(false)
    }
  }, [clave])

  useEffect(() => {
    recargar()
  }, [recargar])

  return { datos, cargando, recargar }
}
