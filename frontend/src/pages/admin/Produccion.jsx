import { useState } from "react"
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

export default function Produccion() {
  const { datos: [lotes], cargando, recargar: cargarLotes } = useCargarDatos([`${API_URL}/produccion`])
  const [filtroEstado, setFiltroEstado] = useState("Todos")
  const [busqueda, setBusqueda] = useState("")
  const [modalControlar, setModalControlar] = useState(null)
  const [obsControlar, setObsControlar] = useState("")

  const filtrados = lotes.filter((l) => {
    const coincideBusqueda =
      l.nro_lote.toLowerCase().includes(busqueda.toLowerCase()) ||
      (l.producto || "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (l.operario || "").toLowerCase().includes(busqueda.toLowerCase())
    const coincideEstado = filtroEstado === "Todos" || l.estado === filtroEstado
    return coincideBusqueda && coincideEstado
  })

  async function handleControlar() {
    await fetchAuth(`${API_URL}/produccion/${modalControlar}/controlar`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ observaciones: obsControlar.trim() || null }),
    })
    setModalControlar(null)
    setObsControlar("")
    await cargarLotes()
  }

  if (cargando) return <div style={{ padding: "0" }}><SkeletonTabla filas={5} columnas={5} /></div>

  return (
    <div>
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Producción</h1>
          <p style={estilos.subtitulo}>Control de lotes de fabricación</p>
        </div>
      </div>

      <div style={estilos.barra}>
        <input
          style={estilos.buscador}
          placeholder="Buscar por número, producto u operario..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

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

      <div style={estilos.tabla}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={estilos.thead}>
              <th style={estilos.th}>Nro. lote</th>
              <th style={estilos.th}>Producto</th>
              <th style={estilos.th}>Elaboración</th>
              <th style={estilos.th}>Vencimiento</th>
              <th style={estilos.th}>Cantidad</th>
              <th style={estilos.th}>Operario</th>
              <th style={estilos.th}>Estado</th>
              <th style={estilos.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} style={estilos.vacio}>
                  {busqueda || filtroEstado !== "Todos"
                    ? "Sin resultados para los filtros aplicados."
                    : "No hay lotes de producción registrados aún."}
                </td>
              </tr>
            )}
            {filtrados.map((l) => {
              const col = COLORES_ESTADO[l.estado] || {}
              return (
                <tr key={l.id_lote} style={estilos.fila}>
                  <td style={{ ...estilos.td, fontWeight: "600" }}>{l.nro_lote}</td>
                  <td style={estilos.td}>{l.producto}</td>
                  <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{l.fecha_elaboracion}</td>
                  <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{l.fecha_vencimiento}</td>
                  <td style={estilos.td}>{l.cantidad_producida} u.</td>
                  <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{l.operario}</td>
                  <td style={estilos.td}>
                    <span style={{ ...estilos.badge, backgroundColor: col.bg, color: col.color }}>
                      {l.estado}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    {l.estado === "Finalizado" ? (
                      <button style={estilos.accionVerde} onClick={() => { setModalControlar(l.id_lote); setObsControlar("") }}>
                        Marcar controlado
                      </button>
                    ) : (
                      <span style={{ color: "var(--text-hint)", fontSize: "0.8rem" }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filtrados.length > 0 && (
        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-primary)" }}>
            Insumos utilizados por lote
          </h2>
          {filtrados.map((l) => (
            <DetalleLote key={l.id_lote} lote={l} />
          ))}
        </div>
      )}

      {modalControlar && (
        <div style={estilos.overlay}>
          <div style={estilos.modalBox}>
            <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
              Marcar lote como Controlado
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Podés agregar una observación sobre el resultado del control de calidad.
            </p>
            <textarea
              style={estilos.textarea}
              placeholder="Observaciones del control (opcional)..."
              value={obsControlar}
              onChange={(e) => setObsControlar(e.target.value)}
              rows={4}
            />
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
              <button style={estilos.btnCancelar} onClick={() => { setModalControlar(null); setObsControlar("") }}>
                Cancelar
              </button>
              <button style={estilos.accionVerde} onClick={handleControlar}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetalleLote({ lote }) {
  const col = COLORES_ESTADO[lote.estado] || {}

  return (
    <div style={estilos.detalleCard}>
      <div style={estilos.detalleEncabezado}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>{lote.nro_lote}</span>
          <span style={{ ...estilos.badge, backgroundColor: col.bg, color: col.color }}>{lote.estado}</span>
        </div>
        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          {lote.producto} — {lote.cantidad_producida} u. — {lote.fecha_elaboracion} — {lote.operario}
        </span>
      </div>

      {lote.insumos.length === 0 ? (
        <p style={{ fontSize: "0.8rem", color: "var(--text-hint)", marginTop: "0.75rem" }}>
          Sin insumos registrados para este lote.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
          {lote.insumos.map((iu) => (
            <div key={iu.id_insumo} style={estilos.insumoChip}>
              <span style={{ fontWeight: "600" }}>{iu.insumo}</span>
              <span style={{ color: "var(--text-hint)" }}> · {iu.cantidad_usada} {iu.unidad_medida}</span>
            </div>
          ))}
        </div>
      )}

      {lote.observaciones && (
        <p style={estilos.obs}>Obs: {lote.observaciones}</p>
      )}
    </div>
  )
}

const estilos = {
  ...estilosComunes,
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  barra: { marginBottom: "0.75rem" },
  buscador: { width: "100%", padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", backgroundColor: "var(--bg-surface)", boxShadow: "var(--shadow-xs)" },
  filtros: { display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" },
  filtro: { padding: "0.4rem 0.85rem", borderRadius: "var(--radius-md)", fontSize: "0.78rem", border: "1px solid var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)", cursor: "pointer" },
  vacio: { padding: "2.5rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem" },
  badge: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600" },
  accionVerde: { fontSize: "0.8rem", color: "var(--verde-oscuro)", cursor: "pointer", fontWeight: "600", border: "1px solid var(--verde)", padding: "0.25rem 0.6rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--verde-claro)" },
  detalleCard: { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", padding: "1rem 1.25rem" },
  detalleEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" },
  insumoChip: { backgroundColor: "var(--bg-page)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "0.3rem 0.65rem", fontSize: "0.8rem", color: "var(--text-primary)" },
  obs: { fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem", fontStyle: "italic" },
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalBox: { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-xl)", padding: "1.5rem", width: "100%", maxWidth: "480px" },
  textarea: { width: "100%", padding: "0.65rem 0.9rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", resize: "vertical", boxSizing: "border-box" },
  btnCancelar: { fontSize: "0.8rem", color: "var(--text-secondary)", cursor: "pointer", fontWeight: "600", border: "1px solid var(--border)", padding: "0.25rem 0.6rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-surface-2)" },
}
