import L from "leaflet"

const TAMANO = 28

function crearIcono(contenido, { fondo, redondo = true, tamanoLetra = 12 }) {
  const estilo = [
    `background:${fondo}`,
    `width:${TAMANO}px`,
    `height:${TAMANO}px`,
    `border-radius:${redondo ? "50%" : "6px"}`,
    "border:3px solid white",
    "box-shadow:0 2px 8px rgba(0,0,0,0.3)",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    `font-size:${tamanoLetra}px`,
    "font-weight:700",
    "color:white",
  ].join(";")

  return L.divIcon({
    html: `<div style="${estilo}">${contenido}</div>`,
    iconSize: [TAMANO, TAMANO],
    iconAnchor: [TAMANO / 2, TAMANO / 2],
    className: "",
  })
}

export function iconoParada(numero, completada) {
  return crearIcono(numero, { fondo: completada ? "#9CA3AF" : "#1D9E75" })
}

export const iconoDeposito = crearIcono("D", { fondo: "#1E3A5F", redondo: false, tamanoLetra: 14 })
