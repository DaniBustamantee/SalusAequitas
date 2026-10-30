import { useState, useEffect, useMemo } from "react"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { useTheme } from "../../context/ThemeContext"
import { SkeletonCards } from "../../components/ui/Skeleton"
import { estilosComunes } from "../../styles/estilosComunes"

const PERIODOS = [
  { val: "hoy", lab: "Hoy" },
  { val: "semana", lab: "Esta semana" },
  { val: "mes", lab: "Este mes" },
  { val: "trimestre", lab: "Trimestre" },
  { val: "anio", lab: "Este año" },
  { val: "todo", lab: "Todo" },
]

export default function Dashboard() {
  const { tema } = useTheme()
  const [todosPedidos, setTodosPedidos] = useState([])
  const [todosEnvios, setTodosEnvios] = useState([])
  const [todosLotes, setTodosLotes] = useState([])
  const [todosClientes, setTodosClientes] = useState([])
  const [todosProveedores, setTodosProveedores] = useState([])
  const [todosInsumos, setTodosInsumos] = useState([])
  const [productos, setProductos] = useState([])
  const [zonas, setZonas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [actualizando, setActualizando] = useState(false)

  async function cargarDashboard(silencioso = false) {
    if (silencioso) setActualizando(true)
    else setCargando(true)
    try {
      const [resP, resE, resL, resC, resPr, resI, resProd, resZ] = await Promise.all([
        fetchAuth(`${API_URL}/pedidos`),
        fetchAuth(`${API_URL}/envios`),
        fetchAuth(`${API_URL}/produccion`),
        fetchAuth(`${API_URL}/clientes`),
        fetchAuth(`${API_URL}/proveedores`),
        fetchAuth(`${API_URL}/insumos`),
        fetchAuth(`${API_URL}/productos`),
        fetchAuth(`${API_URL}/zonas`),
      ])
      const [p, e, l, c, pr, i, prod, z] = await Promise.all([
        resP.json(), resE.json(), resL.json(), resC.json(),
        resPr.json(), resI.json(), resProd.json(), resZ.json(),
      ])
      setTodosPedidos(Array.isArray(p) ? p : [])
      setTodosEnvios(Array.isArray(e) ? e : [])
      setTodosLotes(Array.isArray(l) ? l : [])
      setTodosClientes(Array.isArray(c) ? c : [])
      setTodosProveedores(Array.isArray(pr) ? pr : [])
      setTodosInsumos(Array.isArray(i) ? i : [])
      setProductos(Array.isArray(prod) ? prod : [])
      setZonas(Array.isArray(z) ? z : [])
    } catch (err) {
      console.error(err)
    } finally {
      setCargando(false)
      setActualizando(false)
    }
  }

  useEffect(() => { cargarDashboard() }, [])

  const lotesAlerta = useMemo(() =>
    todosLotes
      .filter(l => l.fecha_vencimiento)
      .map(l => ({
        ...l,
        diasRestantes: Math.ceil((new Date(l.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24)),
      }))
      .filter(l => l.diasRestantes >= 0 && l.diasRestantes <= 30)
      .sort((a, b) => a.diasRestantes - b.diasRestantes),
    [todosLotes]
  )

  const [periodoRapido, setPeriodoRapido] = useState("todo")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [filtroZona, setFiltroZona] = useState("todas")
  const [vista, setVista] = useState("cantidad")

  function handlePeriodoRapido(val) {
    setPeriodoRapido(val)
    setFechaDesde("")
    setFechaHasta("")
  }
  function handleFechaDesde(v) { setFechaDesde(v); setPeriodoRapido("") }
  function handleFechaHasta(v) { setFechaHasta(v); setPeriodoRapido("") }

  const { rangoDesde, rangoHasta } = useMemo(() => {
    if (fechaDesde || fechaHasta) {
      return {
        rangoDesde: fechaDesde ? new Date(fechaDesde) : null,
        rangoHasta: fechaHasta ? new Date(fechaHasta + "T23:59:59") : null,
      }
    }
    if (!periodoRapido || periodoRapido === "todo") return { rangoDesde: null, rangoHasta: null }
    const hoy = new Date()
    const desde = new Date(hoy)
    switch (periodoRapido) {
      case "hoy":
        desde.setHours(0, 0, 0, 0)
        return { rangoDesde: desde, rangoHasta: hoy }
      case "semana":
        desde.setDate(hoy.getDate() - 7)
        return { rangoDesde: desde, rangoHasta: null }
      case "mes":
        desde.setDate(1); desde.setHours(0, 0, 0, 0)
        return { rangoDesde: desde, rangoHasta: null }
      case "trimestre":
        desde.setMonth(Math.floor(hoy.getMonth() / 3) * 3, 1)
        desde.setHours(0, 0, 0, 0)
        return { rangoDesde: desde, rangoHasta: null }
      case "anio":
        desde.setMonth(0, 1); desde.setHours(0, 0, 0, 0)
        return { rangoDesde: desde, rangoHasta: null }
      default:
        return { rangoDesde: null, rangoHasta: null }
    }
  }, [periodoRapido, fechaDesde, fechaHasta])

  function enRango(fechaStr) {
    if (!fechaStr) return true

    const f = new Date(fechaStr.length === 10 ? fechaStr + "T00:00:00" : fechaStr)
    if (rangoDesde && f < rangoDesde) return false
    if (rangoHasta && f > rangoHasta) return false
    return true
  }

  const pedidosFiltrados = useMemo(() =>
    todosPedidos.filter(p => {
      if (filtroZona !== "todas" && p.id_zona !== Number(filtroZona)) return false
      return enRango(p.fecha_pedido)
    }),
    [todosPedidos, filtroZona, rangoDesde, rangoHasta]
  )

  const lotesFiltrados = useMemo(() =>
    todosLotes.filter(l => enRango(l.fecha_elaboracion)),
    [todosLotes, rangoDesde, rangoHasta]
  )

  const enviosFiltrados = useMemo(() => {
    const ids = new Set(pedidosFiltrados.map(p => p.id_pedido))
    return todosEnvios.filter(e => ids.has(e.id_pedido))
  }, [todosEnvios, pedidosFiltrados])

  const clientesFiltrados = useMemo(() =>
    todosClientes.filter(c =>
      c.activo && (filtroZona === "todas" || c.id_zona === Number(filtroZona))
    ),
    [todosClientes, filtroZona]
  )

  const provActivos = todosProveedores.filter(p => p.activo).length
  const provTotal = todosProveedores.length
  const provSalud = provActivos >= 2 ? "verde" : provActivos === 1 ? "naranja" : "rojo"

  const insumosBajoMin = todosInsumos.filter(i => i.stock_actual <= i.stock_minimo).length
  const insumosTotal = todosInsumos.length
  const insumosSalud = insumosBajoMin === 0 ? "verde" : insumosBajoMin <= 1 ? "naranja" : "rojo"

  const lotesEnProceso = lotesFiltrados.filter(l => l.estado === "En proceso").length
  const lotesTotal = lotesFiltrados.length
  const produccionSalud = lotesEnProceso >= 1 ? "verde" : lotesTotal > 0 ? "naranja" : "rojo"

  const stockTotal = productos.reduce((a, p) => a + p.stock_actual, 0)
  const stockCritico = productos.some(p => p.stock_actual <= p.stock_critico)
  const stockBajoMin = productos.some(p => p.stock_actual <= p.stock_minimo && p.stock_actual > p.stock_critico)
  const stockSalud = stockCritico ? "rojo" : stockBajoMin ? "naranja" : "verde"

  const clientesActivos = clientesFiltrados.length
  const clientesSalud = clientesActivos >= 3 ? "verde" : clientesActivos >= 1 ? "naranja" : "rojo"

  const pedidosActivos = pedidosFiltrados.filter(p => !["Entregado", "Cancelado"].includes(p.estado)).length
  const pedidosCancelados = pedidosFiltrados.filter(p => p.estado === "Cancelado").length
  const pedidosTotal = pedidosFiltrados.length
  const pctCancel = pedidosTotal > 0 ? pedidosCancelados / pedidosTotal : 0
  const pedidosSalud = pctCancel > 0.3 ? "rojo" : pctCancel > 0.1 ? "naranja" : "verde"

  const enviosEnCurso = enviosFiltrados.filter(e => !e.resultado_entrega).length
  const enviosTotal = enviosFiltrados.length
  const enviosSalud = enviosTotal === 0 ? "naranja" : enviosEnCurso >= 0 ? "verde" : "naranja"

  const conResultado = enviosFiltrados.filter(e => e.resultado_entrega)
  const completos = conResultado.filter(e => e.resultado_entrega === "completo").length
  const tasaExito = conResultado.length > 0 ? Math.round((completos / conResultado.length) * 100) : null
  const entregaSalud = tasaExito === null ? "naranja" : tasaExito >= 75 ? "verde" : tasaExito >= 50 ? "naranja" : "rojo"

  const nodos = {
    proveedores: { titulo: "Proveedores", valor: `${provActivos} activos`, sub: `de ${provTotal} registrados`, salud: provSalud },
    insumos: { titulo: "Insumos", valor: `${insumosTotal} ítems`, sub: `${insumosBajoMin} bajo mínimo`, salud: insumosSalud },
    produccion: { titulo: "Producción", valor: `${lotesEnProceso} en proceso`, sub: `${lotesTotal} lotes en período`, salud: produccionSalud },
    stock: { titulo: "Stock", valor: `${stockTotal.toLocaleString()} u.`, sub: stockCritico ? "Nivel crítico" : "Niveles normales", salud: stockSalud },
    clientes: { titulo: "Clientes", valor: `${clientesActivos} activos`, sub: filtroZona !== "todas" ? "en esta zona" : "en el sistema", salud: clientesSalud },
    pedidos: { titulo: "Pedidos", valor: `${pedidosTotal} total`, sub: `${pedidosActivos} activos`, salud: pedidosSalud },
    envios: { titulo: "Envíos", valor: `${enviosEnCurso} en curso`, sub: `${enviosTotal} en período`, salud: enviosSalud },
    entrega: { titulo: "Entrega", valor: tasaExito !== null ? `${tasaExito}%` : "—", sub: "tasa de éxito", salud: entregaSalud },
  }

  const hayFiltros = periodoRapido !== "todo" || fechaDesde || fechaHasta || filtroZona !== "todas"

  if (cargando) return <SkeletonCards cantidad={6} />

  return (
    <div>
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Dashboard</h1>
          <p style={estilos.subtitulo}>Resumen general del sistema</p>
        </div>
        <button
          style={{ ...estilos.botonActualizar, opacity: actualizando ? 0.6 : 1 }}
          onClick={() => cargarDashboard(true)}
          disabled={actualizando}
        >
          {actualizando ? "Actualizando..." : "↻ Actualizar"}
        </button>
      </div>

      {lotesAlerta.length > 0 && (
        <div style={estilos.alertaBanner}>
          <div style={{ flex: 1 }}>
            <p style={estilos.alertaTitulo}>
              {lotesAlerta.length === 1 ? "1 lote próximo a vencer" : `${lotesAlerta.length} lotes próximos a vencer`}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
              {lotesAlerta.map((l) => {
                const critico = l.diasRestantes <= 7
                return (
                  <span key={l.id_lote} style={{
                    display: "inline-block", padding: "0.25rem 0.7rem",
                    borderRadius: "var(--radius-sm)", fontSize: "0.78rem", fontWeight: "600",
                    backgroundColor: critico ? "var(--rojo-claro)" : "var(--naranja-claro)",
                    color: critico ? "var(--rojo)" : "var(--naranja)",
                    border: `1px solid ${critico ? "var(--rojo)" : "var(--naranja)"}`,
                  }}>
                    {l.nro_lote} · {l.producto || "—"} · vence en {l.diasRestantes} día{l.diasRestantes !== 1 ? "s" : ""}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div style={estilos.cardPert}>

        <div style={estilos.pertHeader}>
          <div>
            <h2 style={estilos.pertTitulo}>Panel de control</h2>
            <p style={estilos.pertSubtitulo}>Flujo completo de la cadena de valor · {pedidosTotal} pedido{pedidosTotal !== 1 ? "s" : ""} en el período</p>
          </div>
          <div style={estilos.vistaToggle}>
            <button
              style={vista === "cantidad" ? { ...estilos.vistaBtn, ...estilos.vistaBtnActivo } : estilos.vistaBtn}
              onClick={() => setVista("cantidad")}
            >
              Cantidad
            </button>
            <button
              style={vista === "estado" ? { ...estilos.vistaBtn, ...estilos.vistaBtnActivo } : estilos.vistaBtn}
              onClick={() => setVista("estado")}
            >
              Estado
            </button>
          </div>
        </div>

        <div style={estilos.filtrosBar}>

          <div style={estilos.filtroGrupo}>
            <span style={estilos.filtroLabel}>Período rápido</span>
            <div style={estilos.filtroOpciones}>
              {PERIODOS.map(({ val, lab }) => (
                <button
                  key={val}
                  style={periodoRapido === val ? { ...estilos.filtroBtn, ...estilos.filtroBtnActivo } : estilos.filtroBtn}
                  onClick={() => handlePeriodoRapido(val)}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>

          <div style={estilos.filtroGrupo}>
            <span style={estilos.filtroLabel}>Rango personalizado</span>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input type="date" style={estilos.inputFecha} value={fechaDesde} onChange={e => handleFechaDesde(e.target.value)} />
              <span style={{ fontSize: "0.8rem", color: "var(--text-hint)" }}>→</span>
              <input type="date" style={estilos.inputFecha} value={fechaHasta} onChange={e => handleFechaHasta(e.target.value)} />
            </div>
          </div>

          <div style={estilos.filtroGrupo}>
            <span style={estilos.filtroLabel}>Zona geográfica</span>
            <select style={estilos.filtroSelect} value={filtroZona} onChange={e => setFiltroZona(e.target.value)}>
              <option value="todas">Todas las zonas</option>
              {zonas.map(z => <option key={z.id_zona} value={z.id_zona}>{z.nombre}</option>)}
            </select>
          </div>

          {hayFiltros && (
            <button style={estilos.btnLimpiar} onClick={() => {
              setPeriodoRapido("todo"); setFechaDesde(""); setFechaHasta(""); setFiltroZona("todas")
            }}>
              ✕ Limpiar filtros
            </button>
          )}
        </div>

        <DiagramaPERT nodos={nodos} vista={vista} tema={tema} />

        <div style={estilos.pertLeyenda}>
          {[
            { color: "#16A34A", label: "Normal / Saludable" },
            { color: "#D97706", label: "Atención / Por debajo del mínimo" },
            { color: "#DC2626", label: "Crítico / Requiere acción inmediata" },
          ].map(({ color, label }) => (
            <span key={label} style={estilos.leyendaItem}>
              <span style={{ width: 8, height: 8, borderRadius: "2px", backgroundColor: color, flexShrink: 0 }} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

const NW = 124, NH = 58, NRX = 8, HW = 62, STRIPE = 4
const TOP_Y = 20, BOT_Y = 142
const PERT_CX = [74, 278, 482, 686]

const TOP_NODOS = [
  { key: "proveedores", cx: PERT_CX[0] },
  { key: "insumos", cx: PERT_CX[1] },
  { key: "produccion", cx: PERT_CX[2] },
  { key: "stock", cx: PERT_CX[3] },
]
const BOT_NODOS = [
  { key: "clientes", cx: PERT_CX[0] },
  { key: "pedidos", cx: PERT_CX[1] },
  { key: "envios", cx: PERT_CX[2] },
  { key: "entrega", cx: PERT_CX[3] },
]

const PALETA = {
  light: {
    verde: { bg: "#FFFFFF", border: "rgba(22,163,74,0.18)", stripe: "#16A34A", text: "#166534", label: "NORMAL" },
    naranja: { bg: "#FFFFFF", border: "rgba(217,119,6,0.18)", stripe: "#D97706", text: "#92400E", label: "ATENCIÓN" },
    rojo: { bg: "#FFF7F7", border: "rgba(220,38,38,0.18)", stripe: "#DC2626", text: "#991B1B", label: "CRÍTICO" },
  },
  dark: {
    verde: { bg: "#1A2E1C", border: "rgba(34,197,94,0.25)", stripe: "#22C55E", text: "#4ADE80", label: "NORMAL" },
    naranja: { bg: "#2A1E0A", border: "rgba(251,191,36,0.25)", stripe: "#FBBF24", text: "#FCD34D", label: "ATENCIÓN" },
    rojo: { bg: "#2A1010", border: "rgba(248,113,113,0.25)", stripe: "#F87171", text: "#FCA5A5", label: "CRÍTICO" },
  },
}

function aMk(s) { return s === "rojo" ? "url(#mr)" : s === "naranja" ? "url(#mn)" : "url(#mv)" }
function aSt(s) { return s === "rojo" ? "#DC2626" : s === "naranja" ? "#D97706" : "#16A34A" }

function DiagramaPERT({ nodos, vista, tema }) {
  const isDark = tema === "dark"
  const paleta = isDark ? PALETA.dark : PALETA.light
  const GRAY_T = isDark ? "#8FAF96" : "#64748B"
  const GRAY_S = isDark ? "#5A7A60" : "#94A3B8"
  const BAND_BG = isDark ? "#1A2A1C" : "#F8FAFC"
  const BAND_ST = isDark ? "#2A3E2C" : "#E2E8F0"
  const SHADOW_C = isDark ? "rgba(0,0,0,0.35)" : "rgba(15,23,42,0.06)"

  const midY = Math.round((TOP_Y + NH + BOT_Y) / 2)

  function Nodo({ cx, rowY, nodeKey }) {
    const n = nodos[nodeKey]
    if (!n) return null
    const p = paleta[n.salud] || paleta.verde
    const x = cx - HW
    const tx = x + STRIPE + 8
    const ic = x + STRIPE + 20

    return (
      <g>

        <rect x={x + 2} y={rowY + 3} width={NW} height={NH} rx={NRX}
          fill={SHADOW_C} />

        <rect x={x} y={rowY} width={NW} height={NH} rx={NRX}
          fill={p.bg} stroke={p.border} strokeWidth="1.2" />

        <clipPath id={`c-${nodeKey}`}>
          <rect x={x} y={rowY} width={NW} height={NH} rx={NRX} />
        </clipPath>
        <rect x={x} y={rowY} width={STRIPE} height={NH}
          fill={p.stripe} clipPath={`url(#c-${nodeKey})`} />

        {vista === "cantidad" ? (
          <>

            <text x={tx} y={rowY + 14} fontSize="7" fill={GRAY_T}
              fontWeight="600" letterSpacing="0.9">
              {n.titulo.toUpperCase()}
            </text>

            <text x={tx} y={rowY + 34} fontSize="13.5" fontWeight="800" fill={p.text}>
              {n.valor}
            </text>

            <text x={tx} y={rowY + 47} fontSize="7" fill={GRAY_S}>
              {n.sub}
            </text>
          </>
        ) : (
          <>

            <text x={tx} y={rowY + 14} fontSize="7" fill={GRAY_T}
              fontWeight="600" letterSpacing="0.9">
              {n.titulo.toUpperCase()}
            </text>

            <circle cx={ic} cy={rowY + 36} r={11} fill={p.stripe} opacity="0.12" />
            <circle cx={ic} cy={rowY + 36} r={8} fill={p.stripe} />

            <text x={ic} y={rowY + 40} textAnchor="middle"
              fontSize="9" fontWeight="900" fill="white">
              {n.salud === "verde" ? "✓" : n.salud === "naranja" ? "!" : "✕"}
            </text>

            <text x={ic + 16} y={rowY + 40} fontSize="8" fontWeight="700" fill={p.stripe}>
              {p.label}
            </text>
          </>
        )}
      </g>
    )
  }

  return (
    <svg viewBox="0 0 760 222" style={{ width: "100%", height: "auto", display: "block", margin: "0.75rem 0" }}>
      <defs>
        {[["mv", "#16A34A"], ["mn", "#D97706"], ["mr", "#DC2626"]].map(([id, c]) => (
          <marker key={id} id={id} markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
            <polygon points="0 0, 7 2.5, 0 5" fill={c} />
          </marker>
        ))}
      </defs>

      <rect x={10} y={12} width={740} height={72} rx={7}
        fill={BAND_BG} stroke={BAND_ST} strokeWidth="0.8" />
      <rect x={10} y={132} width={740} height={72} rx={7}
        fill={BAND_BG} stroke={BAND_ST} strokeWidth="0.8" />

      {[176, 380, 584].map(lx => (
        <line key={lx} x1={lx} y1={18} x2={lx} y2={206}
          stroke={BAND_ST} strokeWidth="0.8" strokeDasharray="4 4" />
      ))}

      {TOP_NODOS.slice(0, -1).map(({ key, cx }, i) => {
        const sal = nodos[key]?.salud
        return (
          <line key={key}
            x1={cx + HW + 3} y1={TOP_Y + NH / 2}
            x2={TOP_NODOS[i + 1].cx - HW - 9} y2={TOP_Y + NH / 2}
            stroke={aSt(sal)} strokeWidth="1.8" markerEnd={aMk(sal)} />
        )
      })}

      {(() => {
        const sal = nodos.stock?.salud
        const r = 10
        return (
          <path
            d={`M ${PERT_CX[3]} ${TOP_Y + NH + 2}
                L ${PERT_CX[3]} ${midY - r}
                Q ${PERT_CX[3]} ${midY} ${PERT_CX[3] - r} ${midY}
                L ${PERT_CX[1] + r} ${midY}
                Q ${PERT_CX[1]} ${midY} ${PERT_CX[1]} ${midY + r}
                L ${PERT_CX[1]} ${BOT_Y - 8}`}
            fill="none" stroke={aSt(sal)} strokeWidth="1.8"
            strokeDasharray="6 4" markerEnd={aMk(sal)} />
        )
      })()}

      {BOT_NODOS.slice(0, -1).map(({ key, cx }, i) => {
        const sal = nodos[key]?.salud
        return (
          <line key={key}
            x1={cx + HW + 3} y1={BOT_Y + NH / 2}
            x2={BOT_NODOS[i + 1].cx - HW - 9} y2={BOT_Y + NH / 2}
            stroke={aSt(sal)} strokeWidth="1.8" markerEnd={aMk(sal)} />
        )
      })}

      {TOP_NODOS.map(({ key, cx }) => (
        <Nodo key={key} cx={cx} rowY={TOP_Y} nodeKey={key} />
      ))}
      {BOT_NODOS.map(({ key, cx }) => (
        <Nodo key={key} cx={cx} rowY={BOT_Y} nodeKey={key} />
      ))}

      {[
        { cx: PERT_CX[0], label: "Abastecimiento" },
        { cx: PERT_CX[1], label: "Proceso interno" },
        { cx: PERT_CX[2], label: "Operación" },
        { cx: PERT_CX[3], label: "Resultado" },
      ].map(({ cx, label }) => (
        <text key={label} x={cx} y={215} textAnchor="middle"
          fontSize="8" fill={GRAY_S} fontWeight="600" letterSpacing="0.4">
          {label}
        </text>
      ))}
    </svg>
  )
}

const estilos = {
  ...estilosComunes,
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  botonActualizar: { padding: "0.5rem 1rem", backgroundColor: "var(--bg-surface)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.82rem", fontWeight: "600", color: "var(--text-secondary)", cursor: "pointer" },

  alertaBanner: { display: "flex", alignItems: "flex-start", gap: "0.75rem", backgroundColor: "var(--crema)", border: "1px solid var(--naranja)", borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem", marginBottom: "1.25rem", boxShadow: "var(--shadow-naranja)" },
  alertaTitulo: { fontSize: "0.875rem", fontWeight: "700", color: "var(--naranja-oscuro)" },

  cardPert: { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", border: "1px solid var(--border)", padding: "1.5rem" },
  pertHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" },
  pertTitulo: { fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.2rem" },
  pertSubtitulo: { fontSize: "0.78rem", color: "var(--text-secondary)" },

  vistaToggle: { display: "flex", gap: "0.3rem", backgroundColor: "var(--bg-surface-2)", borderRadius: "var(--radius-md)", padding: "0.25rem" },
  vistaBtn: { padding: "0.4rem 0.9rem", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", cursor: "pointer", fontWeight: "500", color: "var(--text-secondary)", backgroundColor: "transparent", border: "none" },
  vistaBtnActivo: { backgroundColor: "var(--bg-surface)", color: "var(--text-primary)", fontWeight: "700", boxShadow: "var(--shadow-xs)" },

  filtrosBar: { display: "flex", gap: "1.5rem", alignItems: "flex-end", flexWrap: "wrap", backgroundColor: "var(--bg-surface-2)", borderRadius: "var(--radius-md)", padding: "0.9rem 1.1rem", marginBottom: "1.25rem" },
  filtroGrupo: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  filtroLabel: { fontSize: "0.7rem", fontWeight: "700", color: "var(--text-hint)", textTransform: "uppercase", letterSpacing: "0.5px" },
  filtroOpciones: { display: "flex", gap: "0.3rem", flexWrap: "wrap" },
  filtroBtn: { padding: "0.35rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.78rem", border: "1.5px solid var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)", cursor: "pointer", fontWeight: "500" },
  filtroBtnActivo: { backgroundColor: "var(--verde-claro)", border: "1.5px solid var(--verde)", color: "var(--verde-oscuro)", fontWeight: "700" },
  filtroSelect: { padding: "0.38rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.78rem", border: "1.5px solid var(--border)", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)", cursor: "pointer", minWidth: "155px" },
  inputFecha: { padding: "0.38rem 0.6rem", borderRadius: "var(--radius-md)", fontSize: "0.78rem", border: "1.5px solid var(--border)", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)", cursor: "pointer" },
  btnLimpiar: { alignSelf: "flex-end", padding: "0.38rem 0.85rem", borderRadius: "var(--radius-md)", fontSize: "0.78rem", border: "1.5px solid var(--rojo)", color: "var(--rojo)", backgroundColor: "var(--rojo-claro)", cursor: "pointer", fontWeight: "600" },

  pertLeyenda: { display: "flex", gap: "1.5rem", flexWrap: "wrap", paddingTop: "1rem", borderTop: "1px solid var(--border)", marginTop: "0.5rem" },
  leyendaItem: { display: "flex", alignItems: "center", gap: "0.45rem", fontSize: "0.75rem", color: "var(--text-secondary)" },
}
