import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { SkeletonTabla } from "../../components/ui/Skeleton"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { estilosComunes } from "../../styles/estilosComunes"
import { useCargarDatos } from "../../hooks/useCargarDatos"

const ESTADOS = ["Todos", "En proceso", "Finalizado", "Controlado"]

const COLORES_ESTADO = {
  "En proceso": { bg: "var(--azul-claro)", color: "var(--azul)" },
  "Finalizado": { bg: "var(--naranja-claro)", color: "var(--naranja)" },
  "Controlado": { bg: "var(--verde-claro)", color: "var(--verde-oscuro)" },
}

export default function MisLotes() {
  const { usuario } = useAuth()
  const { datos: [todosLosLotes], cargando, recargar: cargarLotes } = useCargarDatos([`${API_URL}/produccion`])
  const lotes = useMemo(() => todosLosLotes.filter((l) => l.id_usuario === usuario?.id), [todosLosLotes, usuario])
  const navigate = useNavigate()

  const [filtroEstado, setFiltroEstado] = useState("Todos")

  const filtrados = lotes.filter((l) =>
    filtroEstado === "Todos" || l.estado === filtroEstado
  )

  const lotesAlerta = useMemo(() =>
    lotes
      .filter(l => l.fecha_vencimiento)
      .map(l => ({
        ...l,
        diasRestantes: Math.ceil((new Date(l.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24)),
      }))
      .filter(l => l.diasRestantes >= 0 && l.diasRestantes <= 30)
      .sort((a, b) => a.diasRestantes - b.diasRestantes),
    [lotes]
  )

  async function handleFinalizar(id) {
    await fetchAuth(`${API_URL}/produccion/${id}/finalizar`, { method: "PATCH" })
    await cargarLotes()
  }

  if (cargando) return <div style={{ padding: "0" }}><SkeletonTabla filas={4} columnas={5} /></div>

  return (
    <div>
      <div style={estilos.encabezado}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
          <div>
            <h1 style={estilos.titulo}>Mis lotes</h1>
            <p style={estilos.subtitulo}>Lotes de producción registrados</p>
          </div>
          <button style={estilos.botonPrimario} onClick={() => navigate("/operario/nuevo-lote")}>
            + Nuevo lote
          </button>
        </div>
      </div>

      {lotesAlerta.length > 0 && (
        <div style={estilos.alertaBanner}>
          <div>
            <p style={estilos.alertaTitulo}>Lotes próximos a vencer</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.4rem" }}>
              {lotesAlerta.map((l) => {
                const critico = l.diasRestantes <= 7
                return (
                  <span
                    key={l.id_lote}
                    style={{ ...estilos.alertaChip, backgroundColor: critico ? "var(--rojo-claro)" : "var(--naranja-claro)", color: critico ? "var(--rojo)" : "var(--naranja)", border: `1px solid ${critico ? "var(--rojo)" : "var(--naranja)"}` }}
                  >
                    {l.nro_lote} · {l.producto || "—"} · vence en {l.diasRestantes} día{l.diasRestantes !== 1 ? "s" : ""}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div style={estilos.filtros}>
        {ESTADOS.map((e) => (
          <button
            key={e}
            style={filtroEstado === e ? { ...estilos.filtro, ...estilos.filtroActivo } : estilos.filtro}
            onClick={() => setFiltroEstado(e)}
          >
            {e}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filtrados.length === 0 && (
          <div style={estilos.vacio}>
            {filtroEstado !== "Todos" ? "No hay lotes en este estado." : "No tenés lotes registrados."}
          </div>
        )}
        {filtrados.map((l) => {
          const col = COLORES_ESTADO[l.estado] || {}
          return (
            <div key={l.id_lote} style={estilos.card}>
              <div style={estilos.cardTop}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span style={estilos.nroLote}>{l.nro_lote}</span>
                  <span style={{ ...estilos.badge, backgroundColor: col.bg, color: col.color }}>
                    {l.estado}
                  </span>
                </div>
                <span style={estilos.fecha}>{l.fecha_elaboracion}</span>
              </div>

              <div style={estilos.cardDatos}>
                <Dato label="Producto" valor={l.producto || "—"} />
                <Dato label="Cantidad" valor={`${l.cantidad_producida} u.`} />
                <Dato label="Elaboración" valor={l.fecha_elaboracion} />
                <Dato label="Vencimiento" valor={l.fecha_vencimiento || "—"} />
              </div>

              {l.insumos.length > 0 && (
                <div style={{ marginTop: "0.75rem" }}>
                  <p style={estilos.insumosTitulo}>Insumos usados</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.35rem" }}>
                    {l.insumos.map((iu) => (
                      <span key={iu.id_insumo} style={estilos.chip}>
                        {iu.insumo} · {iu.cantidad_usada} {iu.unidad_medida}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {l.observaciones && (
                <p style={estilos.obs}>Obs: {l.observaciones}</p>
              )}

              {l.estado === "En proceso" && (
                <div style={{ marginTop: "1rem" }}>
                  <button style={estilos.botonFinalizar} onClick={() => handleFinalizar(l.id_lote)}>
                    Marcar como finalizado
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Dato({ label, valor }) {
  return (
    <div>
      <p style={{ fontSize: "0.75rem", color: "var(--text-hint)", marginBottom: "0.1rem" }}>{label}</p>
      <p style={{ fontSize: "0.875rem", color: "var(--text-primary)", fontWeight: "500" }}>{valor}</p>
    </div>
  )
}

const estilos = {
  ...estilosComunes,
  encabezado: { marginBottom: "1.25rem" },
  filtros: { display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" },
  filtro: { padding: "0.4rem 0.85rem", borderRadius: "var(--radius-md)", fontSize: "0.78rem", border: "1px solid var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)", cursor: "pointer" },
  alertaBanner: { display: "flex", alignItems: "flex-start", gap: "0.75rem", backgroundColor: "var(--naranja-claro)", border: "1px solid var(--naranja)", borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem", marginBottom: "1rem" },
  alertaIcono: { fontSize: "1.2rem", lineHeight: 1, marginTop: "0.1rem" },
  alertaTitulo: { fontSize: "0.875rem", fontWeight: "700", color: "var(--naranja)" },
  alertaChip: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600" },
  card: { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", padding: "1.25rem" },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" },
  nroLote: { fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)" },
  fecha: { fontSize: "0.8rem", color: "var(--text-secondary)" },
  badge: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600" },
  cardDatos: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem" },
  insumosTitulo: { fontSize: "0.75rem", fontWeight: "600", color: "var(--text-secondary)" },
  chip: { backgroundColor: "var(--bg-page)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.2rem 0.5rem", fontSize: "0.75rem", color: "var(--text-secondary)" },
  obs: { fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem", fontStyle: "italic" },
  botonFinalizar: { padding: "0.5rem 1rem", backgroundColor: "var(--naranja-claro)", color: "var(--naranja)", border: "1px solid var(--naranja)", borderRadius: "var(--radius-md)", fontWeight: "600", fontSize: "0.85rem", cursor: "pointer" },
  vacio: { padding: "2rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem", backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)" },
}
