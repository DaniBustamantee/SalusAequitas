import { useState, useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { SkeletonTabla } from "../../components/ui/Skeleton"
import { estilosComunes } from "../../styles/estilosComunes"
import RutaEnMapa from "../../components/mapa/RutaEnMapa"
import { iconoParada, iconoDeposito } from "../../components/mapa/iconos"

const COORDS_CIUDAD = {
  "Córdoba": { lat: -31.4135, lng: -64.1811 },
  "Villa María": { lat: -32.4079, lng: -63.2442 },
  "Río Cuarto": { lat: -33.1232, lng: -64.3493 },
  "Alta Gracia": { lat: -31.6554, lng: -64.4288 },
  "San Francisco": { lat: -31.4278, lng: -62.0853 },
}

const DEPOSITO = { lat: -31.3850, lng: -64.2350, label: "Depósito Salus Aequitas" }

const OSRM_URL = "https://router.project-osrm.org"

export default function RutaDia() {
  const [envios, setEnvios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [ordenParadas, setOrdenParadas] = useState(null)
  const [resumenRuta, setResumenRuta] = useState(null)
  const [modoRuta, setModoRuta] = useState("normal")
  const [optimizando, setOptimizando] = useState(false)
  const [error, setError] = useState("")

  async function cargarEnvios() {
    try {
      const res = await fetchAuth(`${API_URL}/envios/mis-envios`)
      const data = await res.json()
      const lista = Array.isArray(data) ? data : []
      setEnvios(lista)
      setSeleccionados(new Set(lista.map((e) => e.id_envio)))
    } catch {
      setEnvios([])
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargarEnvios() }, [])

  const paradasBase = envios.map((e, idx) => {
    const coords = COORDS_CIUDAD[e.ciudad_entrega] || { lat: -31.4135, lng: -64.1811 }
    return {
      id: e.id_envio,
      numero: idx + 1,
      envio: e,
      lat: coords.lat + idx * 0.008,
      lng: coords.lng + idx * 0.005,
      completado: !!e.resultado_entrega,
    }
  })

  const paradasOrdenadas = (ordenParadas ?? paradasBase).filter((p) => seleccionados.has(p.id))

  const puntosRuta = [
    [DEPOSITO.lat, DEPOSITO.lng],
    ...paradasOrdenadas.map((p) => [p.lat, p.lng]),
  ]

  const pendientes = envios.filter((e) => !e.resultado_entrega)
  const completados = envios.filter((e) => e.resultado_entrega)

  function alternarSeleccion(id) {
    setSeleccionados((anteriores) => {
      const nuevos = new Set(anteriores)
      if (nuevos.has(id)) nuevos.delete(id)
      else nuevos.add(id)
      return nuevos
    })
    setOrdenParadas(null)
    setModoRuta("normal")
    setResumenRuta(null)
    setError("")
  }

  function alternarTodas() {
    const todasMarcadas = seleccionados.size === envios.length
    setSeleccionados(todasMarcadas ? new Set() : new Set(envios.map((e) => e.id_envio)))
    setOrdenParadas(null)
    setModoRuta("normal")
    setResumenRuta(null)
  }

  async function optimizarRuta() {
    const paradasPendientes = paradasBase.filter((p) => seleccionados.has(p.id) && !p.completado)
    if (paradasPendientes.length < 2) { setError("Necesitás al menos 2 paradas pendientes para optimizar."); return }
    setOptimizando(true)
    setError("")
    try {
      const puntos = [
        `${DEPOSITO.lng},${DEPOSITO.lat}`,
        ...paradasPendientes.map((p) => `${p.lng},${p.lat}`),
      ].join(";")

      const res = await fetch(`${OSRM_URL}/trip/v1/driving/${puntos}?overview=false&roundtrip=false&source=first`)
      const data = await res.json()
      if (data.code !== "Ok") throw new Error()

      const paradasDevueltas = data.waypoints.slice(1)
      const ordenOptimo = paradasDevueltas
        .map((punto, i) => ({ parada: paradasPendientes[i], pos: punto.waypoint_index }))
        .sort((a, b) => a.pos - b.pos)
        .map((x) => x.parada)

      const completadas = paradasBase.filter((p) => seleccionados.has(p.id) && p.completado)
      setOrdenParadas([...ordenOptimo, ...completadas])
      setModoRuta("optimizada")
      setResumenRuta(null)
    } catch {
      setError("No se pudo optimizar. Verificá tu conexión.")
    } finally {
      setOptimizando(false)
    }
  }

  const centro = paradasBase.length > 0 ? paradasBase[0] : DEPOSITO

  const unidadesPorProducto = {}
  for (const envio of pendientes.filter((e) => seleccionados.has(e.id_envio))) {
    for (const item of envio.items ?? []) {
      const nombre = item.producto?.replace(" 500ml", "") || `#${item.id_producto}`
      unidadesPorProducto[nombre] = (unidadesPorProducto[nombre] || 0) + item.cantidad
    }
  }
  const cargaPendiente = Object.entries(unidadesPorProducto)

  if (cargando) return <div style={{ padding: "0" }}><SkeletonTabla filas={3} columnas={4} /></div>

  return (
    <div>
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Ruta del día</h1>
          <p style={estilos.subtitulo}>Planificación de entregas asignadas</p>
        </div>
        <div style={estilos.resumen}>
          <ResumenChip valor={paradasBase.length} label="totales" color="var(--azul)" />
          <ResumenChip valor={pendientes.length} label="pendientes" color="var(--naranja)" />
          <ResumenChip valor={completados.length} label="listas" color="var(--verde)" />
        </div>
      </div>

      {paradasBase.length === 0 ? (
        <div style={estilos.vacio}>No tenés envíos asignados.</div>
      ) : (
        <div style={estilos.grilla}>

          <div style={estilos.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <h2 style={estilos.cardTitulo}>Mapa de la ruta</h2>
              <div style={{ display: "flex", gap: "1rem" }}>
                <Leyenda color="#1E3A5F" label="Depósito" cuadrado />
                <Leyenda color="#1D9E75" label="Pendiente" />
                <Leyenda color="#9CA3AF" label="Completada" />
              </div>
            </div>

            {resumenRuta && (
              <div style={{
                ...estilos.resumenRuta,
                backgroundColor: modoRuta === "optimizada" ? "var(--verde-claro)" : "var(--azul-claro)",
                borderColor: modoRuta === "optimizada" ? "var(--verde)" : "var(--azul)",
                color: modoRuta === "optimizada" ? "var(--verde-oscuro)" : "var(--azul)",
              }}>
                {modoRuta === "optimizada" ? "Ruta optimizada · " : "Ruta en orden · "}
                <strong>{resumenRuta.distancia} km</strong> · aprox. <strong>{resumenRuta.duracion} min</strong>
              </div>
            )}

            {error && <div style={estilos.errorBanner}>{error}</div>}

            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", height: "440px" }}>
              <MapContainer
                center={[centro.lat, centro.lng]}
                zoom={10}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {puntosRuta.length >= 2 && (
                  <RutaEnMapa
                    puntos={puntosRuta}
                    color={modoRuta === "optimizada" ? "#1D9E75" : "#3B82F6"}
                    alEncontrarRuta={setResumenRuta}
                  />
                )}

                <Marker position={[DEPOSITO.lat, DEPOSITO.lng]} icon={iconoDeposito}>
                  <Popup><strong>{DEPOSITO.label}</strong><br />Punto de partida</Popup>
                </Marker>

                {paradasOrdenadas.map((p, idx) => (
                  <Marker
                    key={p.id}
                    position={[p.lat, p.lng]}
                    icon={iconoParada(idx + 1, p.completado)}
                  >
                    <Popup>
                      <strong>Parada {idx + 1} — {p.envio.nro_envio}</strong><br />
                      {p.envio.direccion_entrega}<br />
                      {p.envio.ciudad_entrega}<br />
                      <span style={{ fontSize: "0.8rem", color: "#666" }}>
                        {p.envio.contacto_receptor} · {p.envio.telefono_receptor}
                      </span>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

            <div style={estilos.card}>
              <h2 style={estilos.cardTitulo}>Filtrar paradas</h2>

              <button style={estilos.botonAlternar} onClick={alternarTodas}>
                {seleccionados.size === envios.length ? "Deseleccionar todas" : "Seleccionar todas"}
              </button>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", margin: "0.75rem 0" }}>
                {paradasBase.map((p) => (
                  <label key={p.id} style={{ ...estilos.checkLabel, opacity: p.completado ? 0.6 : 1 }}>
                    <input
                      type="checkbox"
                      checked={seleccionados.has(p.id)}
                      onChange={() => alternarSeleccion(p.id)}
                      style={{ accentColor: "var(--verde)", width: "15px", height: "15px", flexShrink: 0 }}
                    />
                    <div>
                      <span style={estilos.checkNro}>{p.envio.nro_envio}</span>
                      <span style={estilos.checkCiudad}> · {p.envio.ciudad_entrega}</span>
                      {p.completado && <span style={estilos.checkListo}> ✓</span>}
                    </div>
                  </label>
                ))}
              </div>

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem" }}>
                <button
                  style={{ ...estilos.botonOptimizar, opacity: optimizando ? 0.6 : 1 }}
                  onClick={optimizarRuta}
                  disabled={optimizando}
                >
                  {optimizando ? "Optimizando..." : "Optimizar orden de ruta"}
                </button>
                {optimizando && (
                  <p style={{ fontSize: "0.72rem", color: "var(--text-hint)", textAlign: "center", marginTop: "0.4rem" }}>
                    Calculando mejor ruta...
                  </p>
                )}
              </div>
            </div>

            <div style={estilos.card}>
              <h2 style={estilos.cardTitulo}>
                Orden de paradas
                {modoRuta === "optimizada" && (
                  <span style={estilos.badgeOptimizado}>OPTIMIZADO</span>
                )}
              </h2>

              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={estilos.paradaItem}>
                  <div style={{ ...estilos.paradaNum, backgroundColor: "#1E3A5F" }}>D</div>
                  <div>
                    <p style={estilos.paradaDir}>Depósito</p>
                    <p style={estilos.paradaSub}>Punto de partida</p>
                  </div>
                </div>

                {paradasOrdenadas.map((p, idx) => (
                  <div key={p.id}>
                    <div style={estilos.conector} />
                    <div style={{ ...estilos.paradaItem, opacity: p.completado ? 0.55 : 1 }}>
                      <div style={{ ...estilos.paradaNum, backgroundColor: p.completado ? "#9CA3AF" : "var(--verde)" }}>
                        {p.completado ? "✓" : idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <p style={estilos.paradaDir}>{p.envio.ciudad_entrega}</p>
                          <span style={{ fontSize: "0.7rem", color: p.completado ? "var(--text-hint)" : "var(--verde-oscuro)", fontWeight: "600" }}>
                            {p.completado ? "Lista" : "Pendiente"}
                          </span>
                        </div>
                        <p style={estilos.paradaSub}>{p.envio.direccion_entrega}</p>
                        <p style={{ ...estilos.paradaSub, color: "var(--text-hint)" }}>{p.envio.nro_envio}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {paradasOrdenadas.length === 0 && (
                  <p style={{ fontSize: "0.875rem", color: "var(--text-hint)", textAlign: "center", padding: "1rem 0" }}>
                    No hay paradas seleccionadas.
                  </p>
                )}
              </div>
            </div>

            <div style={estilos.card}>
              <h2 style={estilos.cardTitulo}>Carga pendiente</h2>
              {cargaPendiente.length === 0 ? (
                <p style={{ fontSize: "0.875rem", color: "var(--text-hint)" }}>Sin carga pendiente.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {cargaPendiente.map(([nombre, cantidad]) => (
                    <div key={nombre} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{nombre}</span>
                      <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>{cantidad} u.</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ResumenChip({ valor, label, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: "1.5rem", fontWeight: "700", color, lineHeight: 1 }}>{valor}</p>
      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{label}</p>
    </div>
  )
}

function Leyenda({ color, label, cuadrado }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
      <div style={{ width: "12px", height: "12px", borderRadius: cuadrado ? "3px" : "50%", backgroundColor: color }} />
      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{label}</span>
    </div>
  )
}

const estilos = {
  ...estilosComunes,
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  resumen: { display: "flex", gap: "1.5rem", alignItems: "center" },
  grilla: { display: "grid", gridTemplateColumns: "1fr 300px", gap: "1rem", alignItems: "start" },
  card: { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", padding: "1.25rem" },
  cardTitulo: { fontSize: "0.95rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.75rem" },
  resumenRuta: { padding: "0.6rem 0.85rem", borderRadius: "var(--radius-md)", border: "1px solid", fontSize: "0.82rem", marginBottom: "0.75rem" },
  errorBanner: { padding: "0.6rem 0.85rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--rojo-claro)", border: "1px solid var(--rojo)", color: "var(--rojo)", fontSize: "0.82rem", marginBottom: "0.75rem" },
  botonAlternar: { fontSize: "0.78rem", color: "var(--azul)", cursor: "pointer", fontWeight: "500", textDecoration: "underline" },
  checkLabel: { display: "flex", alignItems: "center", gap: "0.6rem", cursor: "pointer", padding: "0.3rem 0.4rem", borderRadius: "var(--radius-md)", fontSize: "0.875rem" },
  checkNro: { fontWeight: "600", color: "var(--text-primary)" },
  checkCiudad: { color: "var(--text-secondary)" },
  checkListo: { color: "var(--verde)", fontWeight: "700" },
  botonOptimizar: { width: "100%", padding: "0.65rem", backgroundColor: "var(--verde-claro)", color: "var(--verde-oscuro)", border: "1px solid var(--verde)", borderRadius: "var(--radius-md)", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" },
  badgeOptimizado: { marginLeft: "0.5rem", fontSize: "0.68rem", color: "var(--verde)", fontWeight: "700", backgroundColor: "var(--verde-claro)", padding: "0.1rem 0.4rem", borderRadius: "var(--radius-sm)" },
  paradaItem: { display: "flex", gap: "0.65rem", alignItems: "flex-start" },
  paradaNum: { width: "28px", height: "28px", borderRadius: "50%", color: "white", fontWeight: "700", fontSize: "0.8rem", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  paradaDir: { fontSize: "0.875rem", fontWeight: "600", color: "var(--text-primary)" },
  paradaSub: { fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.1rem" },
  conector: { width: "2px", height: "14px", backgroundColor: "var(--border)", marginLeft: "13px", marginTop: "3px", marginBottom: "3px" },
  vacio: { padding: "3rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem", backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)" },
}
