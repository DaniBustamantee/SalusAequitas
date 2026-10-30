import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
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

const TODOS_LOS_ESTADOS = [
  "Pendiente", "Confirmado", "En preparación",
  "Despachado", "En tránsito", "En entrega", "Entregado",
]

export default function Seguimiento() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const id = Number(params.get("id"))

  const [pedido, setPedido] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (!id) { setCargando(false); return }

    async function cargar() {
      try {
        const res = await fetchAuth(`${API_URL}/pedidos/${id}`)
        const data = await res.json()
        setPedido(res.ok ? data : null)
      } catch {
        setPedido(null)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id])

  if (cargando) return <p style={{ padding: "2rem", color: "var(--text-secondary)" }}>Cargando seguimiento...</p>

  if (!id || !pedido) {
    return (
      <div style={estilos.sinPedido}>
        <p style={estilos.sinPedidoTexto}>Seleccioná un pedido desde "Mis pedidos" para ver su seguimiento.</p>
        <button style={estilos.botonVolver} onClick={() => navigate("/cliente/mis-pedidos")}>
          ← Ir a mis pedidos
        </button>
      </div>
    )
  }

  const colorEstado = COLORES_ESTADO[pedido.estado] || {}
  const idxActual = TODOS_LOS_ESTADOS.indexOf(pedido.estado)

  function calcularTotal() {
    return (pedido.items || []).reduce((acc, item) => acc + Number(item.subtotal || 0), 0)
  }

  return (
    <div>
      <div style={estilos.encabezado}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button style={estilos.botonVolverLink} onClick={() => navigate("/cliente/mis-pedidos")}>
            ← Volver
          </button>
          <div>
            <h1 style={estilos.titulo}>Seguimiento — {pedido.nro_pedido}</h1>
            <p style={estilos.subtitulo}>Estado actual de tu pedido</p>
          </div>
        </div>
        <span style={{ ...estilos.badge, backgroundColor: colorEstado.bg, color: colorEstado.color }}>
          {pedido.estado}
        </span>
      </div>

      <div style={estilos.grilla}>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {pedido.estado !== "Cancelado" && (
            <div style={estilos.card}>
              <h2 style={estilos.cardTitulo}>Progreso del pedido</h2>
              <div style={estilos.progreso}>
                {TODOS_LOS_ESTADOS.map((estado, idx) => {
                  const completado = idx <= idxActual
                  const esActual = idx === idxActual
                  return (
                    <div key={estado} style={estilos.pasoConector}>
                      <div style={estilos.pasoFila}>
                        <div style={{
                          ...estilos.circulo,
                          backgroundColor: completado ? "var(--verde)" : "var(--border)",
                          border: esActual ? "3px solid var(--verde-oscuro)" : "none",
                        }} />
                        <span style={{
                          ...estilos.pasoLabel,
                          color: completado ? "var(--text-primary)" : "var(--text-hint)",
                          fontWeight: esActual ? "700" : "400",
                        }}>
                          {estado}
                        </span>
                      </div>
                      {idx < TODOS_LOS_ESTADOS.length - 1 && (
                        <div style={{
                          ...estilos.lineaConector,
                          backgroundColor: idx < idxActual ? "var(--verde)" : "var(--border)",
                        }} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={estilos.card}>
            <h2 style={estilos.cardTitulo}>Historial de estados</h2>
            {pedido.historial?.length === 0 && (
              <p style={{ fontSize: "0.875rem", color: "var(--text-hint)" }}>Sin historial aún.</p>
            )}
            <div style={estilos.timeline}>
              {[...(pedido.historial || [])].reverse().map((h) => {
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
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          <div style={estilos.card}>
            <h2 style={estilos.cardTitulo}>Datos de entrega</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Dato label="Dirección" valor={pedido.direccion_entrega} />
              <Dato label="Ciudad" valor={pedido.ciudad_entrega} />
              <Dato label="Contacto" valor={pedido.contacto_receptor} />
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
                  <th style={estilos.th}>Cant.</th>
                  <th style={estilos.th}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(pedido.items || []).map((item) => (
                  <tr key={item.id_item} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={estilos.td}>{item.producto || "—"}</td>
                    <td style={estilos.td}>{item.cantidad} u.</td>
                    <td style={{ ...estilos.td, fontWeight: "600" }}>
                      ${Number(item.subtotal).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={estilos.total}>
              <span>Total</span>
              <span style={{ fontWeight: "700" }}>${calcularTotal().toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      </div>
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
  botonVolverLink: { fontSize: "0.875rem", color: "var(--azul)", cursor: "pointer", fontWeight: "500" },
  badge: { display: "inline-block", padding: "0.3rem 0.8rem", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", fontWeight: "600" },
  grilla: { display: "grid", gridTemplateColumns: "1fr 320px", gap: "1rem", alignItems: "start" },
  card: { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", padding: "1.25rem" },
  cardTitulo: { fontSize: "0.95rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "1rem" },
  progreso: { display: "flex", flexDirection: "column" },
  pasoConector: { display: "flex", flexDirection: "column" },
  pasoFila: { display: "flex", alignItems: "center", gap: "0.75rem" },
  circulo: { width: "16px", height: "16px", borderRadius: "50%", flexShrink: 0 },
  pasoLabel: { fontSize: "0.875rem" },
  lineaConector: { width: "2px", height: "24px", marginLeft: "7px" },
  timeline: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  timelineItem: { display: "flex", alignItems: "flex-start", gap: "0.75rem" },
  timelineInfo: { display: "flex", flexDirection: "column", gap: "0.15rem" },
  timelineFecha: { fontSize: "0.78rem", color: "var(--text-secondary)" },
  timelineObs: { fontSize: "0.78rem", color: "var(--text-hint)", fontStyle: "italic" },
  datoLabel: { fontSize: "0.75rem", color: "var(--text-hint)", marginBottom: "0.15rem" },
  datoValor: { fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: "500" },
  th: { padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" },
  td: { padding: "0.6rem 0.75rem", fontSize: "0.875rem", color: "var(--text-primary)" },
  total: { display: "flex", justifyContent: "space-between", padding: "0.75rem", marginTop: "0.5rem", borderTop: "2px solid var(--border)", color: "var(--text-primary)" },
  sinPedido: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "4rem", textAlign: "center" },
  sinPedidoTexto: { fontSize: "0.95rem", color: "var(--text-secondary)" },
  botonVolver: { padding: "0.6rem 1.25rem", backgroundColor: "var(--verde)", color: "white", borderRadius: "var(--radius-md)", fontWeight: "700", boxShadow: "var(--shadow-verde)", fontSize: "0.875rem", cursor: "pointer" },
}
