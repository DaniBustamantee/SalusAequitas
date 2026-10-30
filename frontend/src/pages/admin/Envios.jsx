import { useState } from "react"
import { SkeletonTabla } from "../../components/ui/Skeleton"
import { API_URL } from "../../services/fetchAuth"
import { estilosComunes } from "../../styles/estilosComunes"
import { useCargarDatos } from "../../hooks/useCargarDatos"

const COLORES_RESULTADO = {
  completo: { bg: "var(--verde-claro)", color: "var(--verde-oscuro)" },
  parcial: { bg: "var(--naranja-claro)", color: "var(--naranja)" },
  fallido: { bg: "var(--rojo-claro)", color: "var(--rojo)" },
}

export default function Envios() {
  const { datos: [envios], cargando } = useCargarDatos([`${API_URL}/envios`])
  const [filtro, setFiltro] = useState("todos")

  const incidencias = envios.filter((e) => e.tiene_incidencia).length

  const filtrados = envios.filter((e) => {
    if (filtro === "en_curso") return !e.resultado_entrega
    if (filtro === "entregados") return e.resultado_entrega === "completo"
    if (filtro === "problemas") return e.resultado_entrega === "parcial" || e.resultado_entrega === "fallido"
    if (filtro === "incidencias") return e.tiene_incidencia
    return true
  })

  if (cargando) return <div style={{ padding: "0" }}><SkeletonTabla filas={5} columnas={5} /></div>

  return (
    <div>
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Envíos</h1>
          <p style={estilos.subtitulo}>Estado de todos los envíos</p>
        </div>
      </div>

      {incidencias > 0 && (
        <div style={estilos.alertaIncidencia}>
          <p style={{ fontWeight: "700", fontSize: "0.875rem" }}>
            {incidencias} envío{incidencias > 1 ? "s" : ""} con incidencia reportada
          </p>
          <button
            style={{ marginLeft: "auto", fontSize: "0.8rem", fontWeight: "700", color: "var(--naranja-oscuro)", cursor: "pointer" }}
            onClick={() => setFiltro("incidencias")}
          >
            Ver incidencias →
          </button>
        </div>
      )}

      <div style={estilos.filtros}>
        {[
          { key: "todos", label: "Todos" },
          { key: "en_curso", label: "En curso" },
          { key: "entregados", label: "Entregados" },
          { key: "problemas", label: "Con problemas" },
          { key: "incidencias", label: `Incidencias${incidencias > 0 ? ` (${incidencias})` : ""}` },
        ].map((f) => (
          <button
            key={f.key}
            style={filtro === f.key ? { ...estilos.filtro, ...estilos.filtroActivo } : estilos.filtro}
            onClick={() => setFiltro(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div style={estilos.tabla}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={estilos.thead}>
              <th style={estilos.th}>Nro. envío</th>
              <th style={estilos.th}>Pedido</th>
              <th style={estilos.th}>Transportista</th>
              <th style={estilos.th}>Fecha despacho</th>
              <th style={estilos.th}>Entrega real</th>
              <th style={estilos.th}>Resultado</th>
              <th style={estilos.th}>Observaciones / Incidencia</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} style={estilos.vacio}>
                  {filtro !== "todos"
                    ? "No hay envíos en este estado."
                    : "No hay envíos registrados aún."}
                </td>
              </tr>
            )}
            {filtrados.map((e) => {
              const colorResultado = e.resultado_entrega ? COLORES_RESULTADO[e.resultado_entrega] : null
              return (
                <tr key={e.id_envio} style={estilos.fila}>
                  <td style={{ ...estilos.td, fontWeight: "600" }}>{e.nro_envio}</td>
                  <td style={estilos.td}>{e.nro_pedido || "—"}</td>
                  <td style={estilos.td}>{e.transportista || "—"}</td>
                  <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{e.fecha_despacho || "—"}</td>
                  <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{e.fecha_entrega_real || "—"}</td>
                  <td style={estilos.td}>
                    {colorResultado ? (
                      <span style={{ ...estilos.badge, backgroundColor: colorResultado.bg, color: colorResultado.color }}>
                        {e.resultado_entrega.charAt(0).toUpperCase() + e.resultado_entrega.slice(1)}
                      </span>
                    ) : (
                      <span style={estilos.badgeEnCurso}>En curso</span>
                    )}
                  </td>
                  <td style={estilos.td}>
                    {e.tiene_incidencia ? (
                      <div>
                        <span style={estilos.badgeIncidencia}>Incidencia</span>
                        {e.detalle_incidencia && (
                          <p style={{ fontSize: "0.75rem", color: "var(--naranja-oscuro)", marginTop: "0.25rem" }}>
                            {e.detalle_incidencia}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: "var(--text-secondary)" }}>{e.observaciones || "—"}</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const estilos = {
  ...estilosComunes,
  encabezado: { marginBottom: "2rem" },
  filtros: { display: "flex", gap: "0.4rem", marginBottom: "1rem" },
  vacio: { padding: "2.5rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem" },
  badge: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600" },
  badgeEnCurso: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600", backgroundColor: "var(--azul-claro)", color: "var(--azul)" },
  badgeIncidencia: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "700", backgroundColor: "var(--naranja-claro)", color: "var(--naranja-oscuro)", border: "1px solid var(--naranja)" },
  alertaIncidencia: { display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "var(--naranja-claro)", border: "1.5px solid var(--naranja)", borderRadius: "var(--radius-lg)", padding: "0.85rem 1.25rem", marginBottom: "1rem", color: "var(--naranja-oscuro)" },
}
