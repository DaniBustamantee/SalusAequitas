import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { SkeletonTabla } from "../../components/ui/Skeleton"
import { API_URL } from "../../services/fetchAuth"
import { estilosComunes } from "../../styles/estilosComunes"
import { useCargarDatos } from "../../hooks/useCargarDatos"

const ESTADOS_PEDIDO = [
  "Pendiente", "Confirmado", "En preparación",
  "Despachado", "En tránsito", "En entrega", "Entregado", "Cancelado",
]

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

export default function Pedidos() {
  const { datos: [pedidos], cargando } = useCargarDatos([`${API_URL}/pedidos`])
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("Todos")
  const navigate = useNavigate()

  const filtrados = pedidos.filter((p) => {
    const coincideBusqueda =
      p.nro_pedido.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.razon_social || "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.ciudad_entrega || "").toLowerCase().includes(busqueda.toLowerCase())

    const coincideEstado =
      filtroEstado === "Todos" || p.estado === filtroEstado

    return coincideBusqueda && coincideEstado
  })

  if (cargando) return <div style={{ padding: "0" }}><SkeletonTabla filas={6} columnas={6} /></div>

  return (
    <div>
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Pedidos</h1>
          <p style={estilos.subtitulo}>Gestión de pedidos</p>
        </div>
      </div>

      <div style={estilos.barra}>
        <input
          style={estilos.buscador}
          placeholder="Buscar por número, cliente o ciudad..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div style={estilos.filtrosEstado}>
        {["Todos", ...ESTADOS_PEDIDO].map((e) => (
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
              <th style={estilos.th}>Nro. pedido</th>
              <th style={estilos.th}>Cliente</th>
              <th style={estilos.th}>Ciudad</th>
              <th style={estilos.th}>Fecha</th>
              <th style={estilos.th}>Total</th>
              <th style={estilos.th}>Estado</th>
              <th style={estilos.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} style={estilos.vacio}>
                  {busqueda || filtroEstado !== "Todos"
                    ? "Sin resultados para los filtros aplicados."
                    : "No hay pedidos registrados aún."}
                </td>
              </tr>
            )}
            {filtrados.map((p) => {
              const colorEstado = COLORES_ESTADO[p.estado] || {}
              return (
                <tr key={p.id_pedido} style={estilos.fila}>
                  <td style={{ ...estilos.td, fontWeight: "600" }}>{p.nro_pedido}</td>
                  <td style={estilos.td}>{p.razon_social || "—"}</td>
                  <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{p.ciudad_entrega}</td>
                  <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{p.fecha_pedido}</td>
                  <td style={estilos.td}>${Number(p.total).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={estilos.td}>
                    <span style={{ ...estilos.badge, backgroundColor: colorEstado.bg, color: colorEstado.color }}>
                      {p.estado}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    <button
                      style={estilos.accion}
                      onClick={() => navigate(`/admin/pedidos/${p.id_pedido}`)}
                    >
                      Ver detalle
                    </button>
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
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  barra: { marginBottom: "0.75rem" },
  buscador: { width: "100%", padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", backgroundColor: "var(--bg-surface)", boxShadow: "var(--shadow-xs)" },
  filtrosEstado: { display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" },
  filtro: { padding: "0.4rem 0.85rem", borderRadius: "var(--radius-md)", fontSize: "0.78rem", border: "1px solid var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)", cursor: "pointer" },
  vacio: { padding: "2.5rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem" },
  badge: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600" },
  accion: { fontSize: "0.8rem", color: "var(--azul)", cursor: "pointer", fontWeight: "500" },
}
