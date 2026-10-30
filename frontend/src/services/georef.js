const GEOREF_URL = "https://apis.datos.gob.ar/georef/api"

export async function obtenerProvincias() {
  const respuesta = await fetch(`${GEOREF_URL}/provincias?orden=nombre&max=30`)
  const datos = await respuesta.json()
  return datos.provincias || []
}

export async function obtenerLocalidades(provincia) {
  const respuesta = await fetch(`${GEOREF_URL}/localidades?provincia=${encodeURIComponent(provincia)}&max=500&orden=nombre`)
  const datos = await respuesta.json()
  return datos.localidades || []
}
