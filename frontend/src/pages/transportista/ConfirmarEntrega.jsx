import { useState } from "react"
import { useToast } from "../../context/ToastContext"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { SkeletonTabla } from "../../components/ui/Skeleton"
import { estilosComunes } from "../../styles/estilosComunes"
import { useCargarDatos } from "../../hooks/useCargarDatos"

const COLORES_RESULTADO = {
  completo: { bg: "var(--verde-claro)", color: "var(--verde-oscuro)" },
  parcial: { bg: "var(--naranja-claro)", color: "var(--naranja)" },
  fallido: { bg: "var(--rojo-claro)", color: "var(--rojo)" },
}

const ETIQUETAS_RESULTADO = {
  completo: "Entrega completa",
  parcial: "Entrega parcial",
  fallido: "No se pudo entregar",
}

export default function ConfirmarEntrega() {
  const { showToast } = useToast()

  const { datos: [envios], cargando, recargar: cargarEnvios } = useCargarDatos([`${API_URL}/envios/mis-envios`])
  const [confirmandoId, setConfirmandoId] = useState(null)
  const [resultado, setResultado] = useState("completo")
  const [observaciones, setObservaciones] = useState("")
  const [confirmado, setConfirmado] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [incidenciaId, setIncidenciaId] = useState(null)
  const [detalleIncidencia, setDetalleIncidencia] = useState("")
  const [guardandoInc, setGuardandoInc] = useState(false)

  const pendientes = envios.filter((e) => !e.resultado_entrega)
  const completados = envios.filter((e) => !!e.resultado_entrega)

  function handleSeleccionar(envio) {
    setConfirmandoId(envio.id_envio)
    setResultado("completo")
    setObservaciones("")
    setConfirmado(null)
  }

  function handleCancelar() {
    setConfirmandoId(null)
    setConfirmado(null)
  }

  async function handleConfirmar() {
    if (guardando) return
    setGuardando(true)
    try {
      await fetchAuth(`${API_URL}/envios/${confirmandoId}/confirmar`, {
        method: "PATCH",
        body: JSON.stringify({ resultado, observaciones }),
      })
      setConfirmado({ resultado, observaciones })
      setConfirmandoId(null)
      await cargarEnvios()
    } catch {
      showToast("Error al confirmar la entrega.", "error")
    } finally {
      setGuardando(false)
    }
  }

  function handleAbrirIncidencia(envio) {
    setIncidenciaId(envio.id_envio)
    setDetalleIncidencia("")
    setConfirmandoId(null)
  }

  function handleCancelarIncidencia() {
    setIncidenciaId(null)
    setDetalleIncidencia("")
  }

  async function handleReportarIncidencia() {
    if (!detalleIncidencia.trim() || guardandoInc) return
    setGuardandoInc(true)
    try {
      const res = await fetchAuth(`${API_URL}/envios/${incidenciaId}/incidencia`, {
        method: "PATCH",
        body: JSON.stringify({ detalle: detalleIncidencia }),
      })
      if (!res.ok) {
        const err = await res.json()
        showToast(err.error || "Error al registrar incidencia.", "error")
        return
      }
      showToast("Incidencia reportada. El administrador fue notificado.", "advertencia")
      setIncidenciaId(null)
      setDetalleIncidencia("")
      await cargarEnvios()
    } catch {
      showToast("Error al conectar con el servidor.", "error")
    } finally {
      setGuardandoInc(false)
    }
  }

  if (cargando) return <div style={{ padding: "0" }}><SkeletonTabla filas={3} columnas={4} /></div>

  return (
    <div>
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Confirmar entrega</h1>
          <p style={estilos.subtitulo}>Registrá el resultado de cada entrega realizada</p>
        </div>
        <div style={estilos.resumen}>
          <span style={estilos.resumenItem}><strong>{pendientes.length}</strong> pendientes</span>
          <span style={estilos.resumenItem}><strong>{completados.length}</strong> registradas</span>
        </div>
      </div>

      {confirmado && (
        <div style={{
          ...estilos.exito,
          backgroundColor: confirmado.resultado === "fallido" ? "var(--rojo-claro)" : "var(--verde-claro)",
          borderColor: confirmado.resultado === "fallido" ? "var(--rojo)" : "var(--verde)",
          color: confirmado.resultado === "fallido" ? "var(--rojo)" : "var(--verde-oscuro)",
        }}>
          {confirmado.resultado === "fallido"
            ? "Entrega registrada como fallida. El administrador podrá reasignarla."
            : "Entrega confirmada correctamente."}
        </div>
      )}

      {envios.length === 0 && (
        <div style={estilos.vacio}>No tenés envíos asignados.</div>
      )}

      {pendientes.length === 0 && completados.length > 0 && (
        <div style={{ ...estilos.vacio, marginBottom: "2rem" }}>
          Todas las entregas del día están registradas.
        </div>
      )}

      {pendientes.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={estilos.seccionTitulo}>Pendientes de confirmación</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {pendientes.map((e) => {
              const estaConfirmando = confirmandoId === e.id_envio

              return (
                <div key={e.id_envio} style={{ ...estilos.card, border: estaConfirmando ? "2px solid var(--verde)" : "2px solid transparent" }}>

                  <div style={estilos.cardHeader}>
                    <div>
                      <p style={estilos.nroEnvio}>{e.nro_envio}</p>
                      <p style={estilos.nroPedido}>{e.nro_pedido || "—"}</p>
                    </div>
                    <span style={estilos.badgePendiente}>Pendiente</span>
                  </div>

                  <div style={estilos.datosFila}>
                    <Dato label="Dirección" valor={e.direccion_entrega || "—"} />
                    <Dato label="Ciudad" valor={e.ciudad_entrega || "—"} />
                    <Dato label="Contacto" valor={e.contacto_receptor || "—"} />
                    <Dato label="Teléfono" valor={e.telefono_receptor || "—"} />
                  </div>

                  {e.items?.length > 0 && (
                    <div style={estilos.productosBloque}>
                      <p style={estilos.productosLabel}>Productos a entregar</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.35rem" }}>
                        {e.items.map((item) => (
                          <span key={item.id_producto} style={estilos.chip}>
                            {item.producto?.replace(" 500ml", "") || "—"} · {item.cantidad} u.
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {e.notas && (
                    <div style={estilos.notasBloque}>
                      <p style={estilos.notasLabel}>Indicaciones</p>
                      <p style={estilos.notasTexto}>{e.notas}</p>
                    </div>
                  )}

                  {e.tiene_incidencia ? (
                    <div style={estilos.incidenciaBanner}>
                      <div>
                        <p style={{ fontWeight: "700", fontSize: "0.82rem" }}>Incidencia reportada</p>
                        <p style={{ fontSize: "0.78rem", marginTop: "0.15rem" }}>{e.detalle_incidencia}</p>
                      </div>
                    </div>
                  ) : null}

                  {incidenciaId === e.id_envio && !e.tiene_incidencia ? (
                    <div style={estilos.formBloque}>
                      <p style={{ ...estilos.formTitulo, color: "var(--naranja)" }}>Reportar incidencia</p>
                      <label style={estilos.label}>Describí el problema (obligatorio)</label>
                      <textarea
                        style={estilos.textarea}
                        rows={3}
                        placeholder="Ej: Cliente ausente, dirección incorrecta, accidente en ruta..."
                        value={detalleIncidencia}
                        onChange={(ev) => setDetalleIncidencia(ev.target.value)}
                      />
                      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
                        <button style={estilos.botonSecundario} onClick={handleCancelarIncidencia}>
                          Cancelar
                        </button>
                        <button
                          style={{ ...estilos.botonIncidencia, opacity: (!detalleIncidencia.trim() || guardandoInc) ? 0.5 : 1 }}
                          disabled={!detalleIncidencia.trim() || guardandoInc}
                          onClick={handleReportarIncidencia}
                        >
                          {guardandoInc ? "Reportando..." : "Confirmar incidencia"}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {estaConfirmando ? (
                    <div style={estilos.formBloque}>
                      <p style={estilos.formTitulo}>¿Cómo resultó la entrega?</p>

                      <div style={estilos.opcionesResultado}>
                        {["completo", "parcial", "fallido"].map((r) => (
                          <button
                            key={r}
                            style={{
                              ...estilos.opcionBtn,
                              backgroundColor: resultado === r ? COLORES_RESULTADO[r].bg : "var(--bg-page)",
                              color: resultado === r ? COLORES_RESULTADO[r].color : "var(--text-secondary)",
                              border: resultado === r
                                ? `2px solid ${COLORES_RESULTADO[r].color}`
                                : "2px solid var(--border)",
                              fontWeight: resultado === r ? "700" : "500",
                            }}
                            onClick={() => setResultado(r)}
                          >
                            {ETIQUETAS_RESULTADO[r]}
                          </button>
                        ))}
                      </div>

                      <div style={{ marginTop: "0.75rem" }}>
                        <label style={estilos.label}>
                          Observaciones {resultado === "fallido" ? "(obligatorio)" : "(opcional)"}
                        </label>
                        <textarea
                          style={estilos.textarea}
                          rows={3}
                          placeholder={
                            resultado === "fallido"
                              ? "Describí el motivo por el que no se pudo entregar..."
                              : "Detalles de la entrega..."
                          }
                          value={observaciones}
                          onChange={(ev) => setObservaciones(ev.target.value)}
                        />
                      </div>

                      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
                        <button style={estilos.botonSecundario} onClick={handleCancelar}>
                          Cancelar
                        </button>
                        <button
                          style={{
                            ...estilos.botonConfirmar,
                            opacity: (resultado === "fallido" && !observaciones.trim()) || guardando ? 0.5 : 1,
                          }}
                          disabled={guardando || (resultado === "fallido" && !observaciones.trim())}
                          onClick={handleConfirmar}
                        >
                          {guardando ? "Guardando..." : "Registrar entrega"}
                        </button>
                      </div>
                    </div>
                  ) : !e.tiene_incidencia && incidenciaId !== e.id_envio ? (
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                      <button style={{ ...estilos.botonAbrir, flex: 1 }} onClick={() => handleSeleccionar(e)}>
                        Confirmar entrega
                      </button>
                      <button style={estilos.botonIncidenciaSmall} onClick={() => handleAbrirIncidencia(e)}>
                        Incidencia
                      </button>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {completados.length > 0 && (
        <div>
          <h2 style={estilos.seccionTitulo}>Registradas</h2>
          <div style={estilos.tabla}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={estilos.thead}>
                  <th style={estilos.th}>Nro. envío</th>
                  <th style={estilos.th}>Pedido</th>
                  <th style={estilos.th}>Destino</th>
                  <th style={estilos.th}>Fecha entrega</th>
                  <th style={estilos.th}>Resultado</th>
                  <th style={estilos.th}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {completados.map((e) => {
                  const col = COLORES_RESULTADO[e.resultado_entrega] || {}
                  return (
                    <tr key={e.id_envio} style={estilos.fila}>
                      <td style={{ ...estilos.td, fontWeight: "600" }}>{e.nro_envio}</td>
                      <td style={estilos.td}>{e.nro_pedido || "—"}</td>
                      <td style={estilos.td}>{e.ciudad_entrega || "—"}</td>
                      <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{e.fecha_entrega_real || "—"}</td>
                      <td style={estilos.td}>
                        <span style={{ ...estilos.badge, backgroundColor: col.bg, color: col.color }}>
                          {ETIQUETAS_RESULTADO[e.resultado_entrega] || e.resultado_entrega}
                        </span>
                      </td>
                      <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{e.observaciones || "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function Dato({ label, valor }) {
  return (
    <div>
      <p style={estilos.datoLabel}>{label}</p>
      <p style={estilos.datoValor}>{valor}</p>
    </div>
  )
}

const estilos = {
  ...estilosComunes,
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  resumen: { display: "flex", gap: "1.5rem" },
  resumenItem: { fontSize: "0.875rem", color: "var(--text-secondary)" },
  seccionTitulo: { fontSize: "1rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.75rem" },
  card: { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", padding: "1.25rem", transition: "border-color 0.15s" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" },
  nroEnvio: { fontWeight: "700", fontSize: "1rem", color: "var(--text-primary)" },
  nroPedido: { fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.15rem" },
  datosFila: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" },
  datoLabel: { fontSize: "0.75rem", color: "var(--text-hint)", marginBottom: "0.1rem" },
  datoValor: { fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: "500" },
  productosBloque: { marginBottom: "0.75rem" },
  productosLabel: { fontSize: "0.72rem", fontWeight: "600", color: "var(--text-secondary)", textTransform: "uppercase" },
  chip: { display: "inline-block", backgroundColor: "var(--bg-page)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.2rem 0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" },
  notasBloque: { backgroundColor: "var(--naranja-claro)", borderRadius: "var(--radius-md)", padding: "0.6rem 0.75rem", marginBottom: "1rem" },
  notasLabel: { fontSize: "0.72rem", fontWeight: "600", color: "var(--naranja)", marginBottom: "0.2rem", textTransform: "uppercase" },
  notasTexto: { fontSize: "0.875rem", color: "var(--text-primary)" },
  badgePendiente: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600", backgroundColor: "var(--azul-claro)", color: "var(--azul)" },
  badge: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600" },
  formBloque: { borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "0.5rem" },
  formTitulo: { fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.75rem" },
  opcionesResultado: { display: "flex", gap: "0.5rem", flexWrap: "wrap" },
  opcionBtn: { flex: 1, minWidth: "140px", padding: "0.65rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.85rem", cursor: "pointer", textAlign: "center", transition: "all 0.15s" },
  textarea: { width: "100%", padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)", resize: "vertical", fontFamily: "inherit" },
  botonAbrir: { width: "100%", padding: "0.65rem", backgroundColor: "var(--verde)", color: "white", borderRadius: "var(--radius-md)", fontWeight: "700", boxShadow: "var(--shadow-verde)", fontSize: "0.875rem", cursor: "pointer", marginTop: "0.5rem" },
  botonConfirmar: { flex: 1, padding: "0.65rem", backgroundColor: "var(--verde)", color: "white", borderRadius: "var(--radius-md)", fontWeight: "700", boxShadow: "var(--shadow-verde)", fontSize: "0.875rem", cursor: "pointer" },
  botonSecundario: { padding: "0.65rem 1.25rem", backgroundColor: "var(--bg-surface-3)", color: "var(--text-secondary)", borderRadius: "var(--radius-md)", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer", border: "1px solid var(--border)" },
  vacio: { padding: "2rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem", backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", marginBottom: "1rem" },
  exito: { padding: "0.85rem 1.25rem", borderRadius: "var(--radius-lg)", border: "1px solid", fontSize: "0.875rem", fontWeight: "600", marginBottom: "1.25rem" },
  incidenciaBanner: { display: "flex", alignItems: "flex-start", gap: "0.75rem", backgroundColor: "var(--naranja-claro)", border: "1px solid var(--naranja)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", marginBottom: "0.75rem", color: "var(--naranja-oscuro)" },
  botonIncidencia: { flex: 1, padding: "0.65rem", backgroundColor: "var(--naranja-claro)", color: "var(--naranja-oscuro)", border: "1.5px solid var(--naranja)", borderRadius: "var(--radius-md)", fontWeight: "700", fontSize: "0.875rem", cursor: "pointer" },
  botonIncidenciaSmall: { padding: "0.65rem 1rem", backgroundColor: "var(--naranja-claro)", color: "var(--naranja-oscuro)", border: "1.5px solid var(--naranja)", borderRadius: "var(--radius-md)", fontWeight: "700", fontSize: "0.82rem", cursor: "pointer", flexShrink: 0 },
}
