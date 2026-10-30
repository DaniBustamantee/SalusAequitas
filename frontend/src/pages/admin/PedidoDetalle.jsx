import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { SkeletonDetalle } from "../../components/ui/Skeleton"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { useToast } from "../../context/ToastContext"
import Modal from "../../components/ui/Modal"
import { estilosComunes } from "../../styles/estilosComunes"

const COLORES_ESTADO = {
  "Pendiente": { bg: "var(--naranja-claro)", color: "var(--naranja)" },
  "Confirmado": { bg: "var(--azul-claro)", color: "var(--azul)" },
  "En preparación": { bg: "var(--azul-claro)", color: "var(--azul)" },
  "Despachado": { bg: "var(--verde-claro)", color: "var(--verde-oscuro)" },
  "En tránsito": { bg: "var(--verde-claro)", color: "var(--verde-oscuro)" },
  "En entrega": { bg: "var(--verde-claro)", color: "var(--verde-oscuro)" },
  "Entregado": { bg: "var(--verde-claro)", color: "var(--verde-oscuro)" },
  "Cancelado": { bg: "var(--rojo-claro)", color: "var(--rojo)" },
}

const ESTADOS_ADMIN = ["Pendiente", "Confirmado", "En preparación"]

const SIGUIENTE = {
  "Pendiente": "Confirmado",
  "Confirmado": "En preparación",
  "En preparación": "Despachado",
}

export default function PedidoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [pedido, setPedido] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [observacion, setObservacion] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [asignacion, setAsignacion] = useState(null)
  const [modalConfirm, setModalConfirm] = useState(false)
  const [accionPendiente, setAccionPendiente] = useState(null)

  async function cargarPedido() {
    try {
      const res = await fetchAuth(`${API_URL}/pedidos/${id}`)
      if (res.status === 404) { setPedido(null); return }
      const data = await res.json()
      setPedido(data)
    } catch {
      setPedido(null)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargarPedido() }, [id])

  function pedirConfirmacion(accion) {
    setAccionPendiente(accion)
    setModalConfirm(true)
  }

  async function ejecutarAccion() {
    setModalConfirm(false)
    if (guardando) return
    setGuardando(true)
    if (accionPendiente === "avanzar") setAsignacion(null)
    try {
      const res = await fetchAuth(`${API_URL}/pedidos/${id}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ accion: accionPendiente, observacion }),
      })
      const data = await res.json()

      if (accionPendiente === "avanzar") {
        if (data.asignacion) setAsignacion(data.asignacion)

        if (data.alertas_stock && data.alertas_stock.length > 0) {
          data.alertas_stock.forEach((prod) => {
            const nivel = prod.stock_actual <= prod.stock_critico ? "crítico" : "bajo"
            showToast(
              `Stock ${nivel}: ${prod.nombre} — quedan ${prod.stock_actual} unidades`,
              prod.stock_actual <= prod.stock_critico ? "error" : "advertencia"
            )
          })
        }
      }

      setObservacion("")
      await cargarPedido()
    } finally {
      setGuardando(false)
      setAccionPendiente(null)
    }
  }

  function totalPedido() {
    if (!pedido?.items?.length) return 0
    return pedido.items.reduce((acc, item) => acc + Number(item.subtotal), 0)
  }

  if (cargando) return <SkeletonDetalle />

  if (!pedido) {
    return (
      <div style={estilos.noEncontrado}>
        <p>Pedido no encontrado.</p>
        <button style={estilos.botonSecundario} onClick={() => navigate("/admin/pedidos")}>
          Volver
        </button>
      </div>
    )
  }

  const colorEstado = COLORES_ESTADO[pedido.estado] || {}
  const esFinal = pedido.es_final
  const puedeAvanzarAdmin = ESTADOS_ADMIN.includes(pedido.estado)
  const proximoEstado = SIGUIENTE[pedido.estado] || null

  return (
    <div>
      <div style={estilos.encabezado}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button style={estilos.botonVolver} onClick={() => navigate("/admin/pedidos")}>
            ← Volver
          </button>
          <div>
            <h1 style={estilos.titulo}>{pedido.nro_pedido}</h1>
            <p style={estilos.subtitulo}>Detalle del pedido</p>
          </div>
        </div>
        <span style={{ ...estilos.badge, backgroundColor: colorEstado.bg, color: colorEstado.color }}>
          {pedido.estado}
        </span>
      </div>

      {asignacion && (
        <div style={estilos.bannerAsignacion}>
          <div>
            <p style={{ fontWeight: "700", fontSize: "0.9rem" }}>Transportista asignado automáticamente</p>
            <p style={{ fontSize: "0.82rem", marginTop: "0.2rem" }}>
              <strong>{asignacion.transportista}</strong> · Envío <strong>{asignacion.nro_envio}</strong> creado
            </p>
          </div>
          <button
            style={{ marginLeft: "auto", fontSize: "1rem", color: "var(--verde-oscuro)", cursor: "pointer", fontWeight: "700" }}
            onClick={() => setAsignacion(null)}
          >✕</button>
        </div>
      )}

      <div style={estilos.grilla}>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          <div style={estilos.card}>
            <h2 style={estilos.cardTitulo}>Datos generales</h2>
            <div style={estilos.datosGrilla}>
              <Dato label="Cliente" valor={pedido.razon_social || "—"} />
              <Dato label="Transportista" valor={pedido.transportista || "Sin asignar"} />
              <Dato label="Fecha del pedido" valor={pedido.fecha_pedido} />
              <Dato label="Entrega estimada" valor={pedido.fecha_entrega_est || "—"} />
              <Dato label="Ciudad de entrega" valor={pedido.ciudad_entrega} />
              <Dato label="Dirección" valor={pedido.direccion_entrega} />
              <Dato label="Contacto receptor" valor={pedido.contacto_receptor || "—"} />
              <Dato label="Teléfono" valor={pedido.telefono_receptor || "—"} />
              {pedido.notas && <Dato label="Notas" valor={pedido.notas} />}
            </div>
          </div>

          <div style={estilos.card}>
            <h2 style={estilos.cardTitulo}>Productos</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={estilos.th}>Producto</th>
                  <th style={estilos.th}>Cantidad</th>
                  <th style={estilos.th}>Precio unit.</th>
                  <th style={estilos.th}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {pedido.items.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: "1rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem" }}>
                      Sin items registrados.
                    </td>
                  </tr>
                )}
                {pedido.items.map((item) => (
                  <tr key={item.id_item} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={estilos.td}>{item.producto}</td>
                    <td style={estilos.td}>{item.cantidad} u.</td>
                    <td style={estilos.td}>${Number(item.precio_unitario).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td style={{ ...estilos.td, fontWeight: "600" }}>
                      ${Number(item.subtotal).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={estilos.total}>
              <span>Total</span>
              <span style={{ fontWeight: "700", fontSize: "1.1rem" }}>
                ${totalPedido().toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {puedeAvanzarAdmin && !esFinal && (
            <div style={estilos.card}>
              <h2 style={estilos.cardTitulo}>Avanzar estado</h2>
              <p style={estilos.textoHint}>
                El próximo estado será: <strong>{proximoEstado}</strong>
              </p>
              <textarea
                style={estilos.textarea}
                placeholder="Observación (opcional)..."
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                rows={3}
              />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                <button style={{ ...estilos.botonPrimario, opacity: guardando ? 0.6 : 1 }} onClick={() => pedirConfirmacion("avanzar")} disabled={guardando}>
                  Pasar a {proximoEstado}
                </button>
                <button style={{ ...estilos.botonPeligro, opacity: guardando ? 0.6 : 1 }} onClick={() => pedirConfirmacion("cancelar")} disabled={guardando}>
                  Cancelar pedido
                </button>
              </div>
            </div>
          )}

          {pedido.estado === "Despachado" && (
            <div style={{ ...estilos.card, borderLeft: "3px solid var(--azul)" }}>
              <h2 style={{ ...estilos.cardTitulo, color: "var(--azul)" }}>Asignado automáticamente</h2>
              {pedido.transportista ? (
                <>
                  <p style={estilos.textoHint}>
                    El sistema asignó este pedido al transportista con menor carga de trabajo en la zona.
                  </p>
                  <div style={{ backgroundColor: "var(--azul-claro)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", marginTop: "0.5rem" }}>
                    <p style={{ fontSize: "0.75rem", color: "var(--azul)", fontWeight: "700", marginBottom: "0.25rem" }}>TRANSPORTISTA ASIGNADO</p>
                    <p style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)" }}>{pedido.transportista}</p>
                  </div>
                </>
              ) : (
                <p style={estilos.textoHint}>
                  No hay transportistas activos disponibles. Asigná uno manualmente desde la sección de Envíos.
                </p>
              )}
            </div>
          )}

          <div style={estilos.card}>
            <h2 style={estilos.cardTitulo}>Historial de estados</h2>
            {pedido.historial.length === 0 ? (
              <p style={{ fontSize: "0.875rem", color: "var(--text-hint)" }}>Sin historial registrado.</p>
            ) : (
              <div style={estilos.timeline}>
                {[...pedido.historial].reverse().map((h) => {
                  const color = COLORES_ESTADO[h.estado] || {}
                  return (
                    <div key={h.id_historial} style={estilos.timelineItem}>
                      <span style={{ ...estilos.badge, backgroundColor: color.bg, color: color.color }}>
                        {h.estado}
                      </span>
                      <div style={estilos.timelineInfo}>
                        <span style={estilos.timelineFecha}>{h.fecha}</span>
                        {h.observacion && (
                          <span style={estilos.timelineObs}>{h.observacion}</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {modalConfirm && (
        <Modal
          titulo={accionPendiente === "cancelar" ? "Cancelar pedido" : `Pasar a ${proximoEstado}`}
          onCerrar={() => setModalConfirm(false)}
          ancho="420px"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            <div style={{
              display: "flex", gap: "1rem", alignItems: "flex-start",
              padding: "1rem",
              backgroundColor: accionPendiente === "cancelar" ? "var(--rojo-claro)" : "var(--azul-claro)",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${accionPendiente === "cancelar" ? "var(--rojo)" : "var(--azul)"}`,
            }}>
              <div>
                <p style={{ fontWeight: "700", fontSize: "0.9rem", color: "var(--text-primary)" }}>
                  {accionPendiente === "cancelar"
                    ? "¿Cancelar este pedido?"
                    : `¿Confirmar el cambio a "${proximoEstado}"?`}
                </p>
                <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
                  {accionPendiente === "cancelar"
                    ? "Esta acción no se puede deshacer. El stock se restaurará automáticamente."
                    : `El pedido ${pedido.nro_pedido} pasará al siguiente estado del flujo.`}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                style={estilos.botonSecundario}
                onClick={() => setModalConfirm(false)}
              >
                No, volver
              </button>
              <button
                style={accionPendiente === "cancelar" ? estilos.botonPeligro : estilos.botonPrimario}
                onClick={ejecutarAccion}
              >
                {accionPendiente === "cancelar" ? "Sí, cancelar" : "Sí, confirmar"}
              </button>
            </div>
          </div>
        </Modal>
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
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" },
  botonVolver: { fontSize: "0.875rem", color: "var(--azul)", cursor: "pointer", fontWeight: "500" },
  badge: { display: "inline-block", padding: "0.3rem 0.8rem", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", fontWeight: "600" },
  grilla: { display: "grid", gridTemplateColumns: "1fr 380px", gap: "1rem", alignItems: "start" },
  card: { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", padding: "1.25rem" },
  cardTitulo: { fontSize: "0.95rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "1rem" },
  datosGrilla: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" },
  datoLabel: { fontSize: "0.75rem", color: "var(--text-hint)", marginBottom: "0.15rem" },
  datoValor: { fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: "500" },
  th: { padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" },
  td: { padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-primary)" },
  total: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", marginTop: "0.5rem", borderTop: "2px solid var(--border)", color: "var(--text-primary)" },
  textoHint: { fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.75rem" },
  textarea: { width: "100%", padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)", resize: "vertical", fontFamily: "inherit" },
  timeline: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  timelineItem: { display: "flex", alignItems: "flex-start", gap: "0.75rem" },
  timelineInfo: { display: "flex", flexDirection: "column", gap: "0.15rem" },
  timelineFecha: { fontSize: "0.78rem", color: "var(--text-secondary)" },
  timelineObs: { fontSize: "0.78rem", color: "var(--text-hint)", fontStyle: "italic" },
  noEncontrado: { display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "3rem", color: "var(--text-secondary)" },
  botonPeligro: { padding: "0.6rem 1.25rem", backgroundColor: "var(--rojo-claro)", color: "var(--rojo)", borderRadius: "var(--radius-md)", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer", border: "1px solid var(--rojo)" },
  bannerAsignacion: { display: "flex", alignItems: "center", gap: "0.85rem", backgroundColor: "var(--verde-claro)", border: "1.5px solid var(--verde)", borderRadius: "var(--radius-lg)", padding: "0.9rem 1.25rem", marginBottom: "1.25rem", color: "var(--verde-oscuro)" },
}
