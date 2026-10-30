export const API_URL = "http://localhost:3001/api"

const CLAVE_TOKEN = "sae_token"
const CLAVE_USUARIO = "sae_usuario"

export async function fetchAuth(url, opciones = {}) {
  const token = localStorage.getItem(CLAVE_TOKEN)

  const respuesta = await fetch(url, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      ...opciones.headers,
      Authorization: `Bearer ${token}`,
    },
  })

  if (respuesta.status === 401) {
    localStorage.removeItem(CLAVE_USUARIO)
    localStorage.removeItem(CLAVE_TOKEN)
    window.location.href = "/login"
    return
  }

  return respuesta
}
