import { useState, useEffect, useMemo } from "react"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { Chart } from "@tanstack/charts/react"
import { barY, barX, defineChart, stack } from "@tanstack/charts"
import { pie, polar, radialArc } from "@tanstack/charts/polar"
import { scaleBand } from "@tanstack/charts/scales/band"
import { scaleLinear } from "@tanstack/charts/scales/linear"
import { estilosComunes } from "../../styles/estilosComunes"

const COLORES = ["var(--verde)", "var(--naranja)", "var(--azul)", "var(--rojo)", "var(--verde-oscuro)"]
const COLORES_HEX = ["#15A35A", "#EF9F27", "#378ADD", "#E24B4A", "#14532D"]

const COLOR_PROVINCIA = {
  "Córdoba": "#15A35A",
  "Buenos Aires": "#2563EB",
  "Santa Fe": "#EA580C",
  "Mendoza": "#7C3AED",
  "Tucumán": "#C0392B",
  "Entre Ríos": "#0891B2",
  "Salta": "#B45309",
  "Misiones": "#BE185D",
}

function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')
}

function generarTonos(baseHex, n) {
  if (n <= 0) return []
  if (n === 1) return [baseHex]
  const [r, g, b] = hexToRgb(baseHex)
  const dR = r * 0.65, dG = g * 0.65, dB = b * 0.65
  const lR = r + (255 - r) * 0.45, lG = g + (255 - g) * 0.45, lB = b + (255 - b) * 0.45
  return Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    return rgbToHex(dR + (lR - dR) * t, dG + (lG - dG) * t, dB + (lB - dB) * t)
  })
}

const ESTADOS_ORDEN = ["Pendiente", "Confirmado", "En preparación", "Despachado", "En tránsito", "En entrega", "Entregado", "Cancelado"]

const COLOR_ESTADO_HEX = {
  "Pendiente": "#EF9F27",
  "Confirmado": "#378ADD",
  "En preparación": "#378ADD",
  "Despachado": "#14532D",
  "En tránsito": "#15A35A",
  "En entrega": "#15A35A",
  "Entregado": "#14532D",
  "Cancelado": "#E24B4A",
}

const TIPOS_ENVIO = ["Completo", "Parcial", "En curso", "Fallido"]
const COLORES_TIPOS = ["#15A35A", "#EF9F27", "#378ADD", "#E24B4A"]

const PERIODOS = [
  { val: "todo", lab: "Todo" },
  { val: "semana", lab: "7 días" },
  { val: "mes", lab: "30 días" },
  { val: "trimestre", lab: "90 días" },
]

export default function Reportes() {
  const [filtroPeriodo, setFiltroPeriodo] = useState("todo")
  const [filtroZona, setFiltroZona] = useState("todas")
  const [filtroTransportista, setFiltroTransportista] = useState("todos")

  const [todosLosPedidos, setTodosLosPedidos] = useState([])
  const [todosLosEnvios, setTodosLosEnvios] = useState([])
  const [transportistas, setTransportistas] = useState([])
  const [zonas, setZonas] = useState([])
  const [ventasProducto, setVentasProducto] = useState([])
  const [cargando, setCargando] = useState(true)
  const [pestana, setPestana] = useState("logistica")
  const [stockCritico, setStockCritico] = useState([])
  const [lotesPorVencer, setLotesPorVencer] = useState([])
  const [entregasFallidas, setEntregasFallidas] = useState([])
  const [pedidosCancelados, setPedidosCancelados] = useState([])
  const [movimientos, setMovimientos] = useState([])
  const [stockActual, setStockActual] = useState([])
  const [entregas, setEntregas] = useState([])
  const [lotes, setLotes] = useState([])

  useEffect(() => {
    async function cargar() {
      try {
        const [resP, resE, resT, resZ, resV, resSC, resLV, resEF, resPC, resMov, resSA, resEnt, resLotes] = await Promise.all([
          fetchAuth(`${API_URL}/pedidos`),
          fetchAuth(`${API_URL}/envios`),
          fetchAuth(`${API_URL}/transportistas`),
          fetchAuth(`${API_URL}/zonas`),
          fetchAuth(`${API_URL}/reportes/ventas-producto`),
          fetchAuth(`${API_URL}/reportes/stock-critico`),
          fetchAuth(`${API_URL}/reportes/lotes-por-vencer`),
          fetchAuth(`${API_URL}/reportes/entregas-fallidas`),
          fetchAuth(`${API_URL}/reportes/pedidos-cancelados`),
          fetchAuth(`${API_URL}/reportes/movimientos-stock`),
          fetchAuth(`${API_URL}/reportes/stock-actual`),
          fetchAuth(`${API_URL}/reportes/entregas`),
          fetchAuth(`${API_URL}/produccion`),
        ])
        const [p, e, t, z, v, sc, lv, ef, pc, mov, sa, ent, lts] = await Promise.all([
          resP.json(), resE.json(), resT.json(), resZ.json(), resV.json(),
          resSC.json(), resLV.json(), resEF.json(), resPC.json(), resMov.json(),
          resSA.json(), resEnt.json(), resLotes.json(),
        ])
        setTodosLosPedidos(Array.isArray(p) ? p : [])
        setTodosLosEnvios(Array.isArray(e) ? e : [])
        setTransportistas(Array.isArray(t) ? t : [])
        setZonas(Array.isArray(z) ? z : [])
        setVentasProducto(Array.isArray(v) ? v : [])
        setStockCritico(Array.isArray(sc) ? sc : [])
        setLotesPorVencer(Array.isArray(lv) ? lv : [])
        setEntregasFallidas(Array.isArray(ef) ? ef : [])
        setPedidosCancelados(Array.isArray(pc) ? pc : [])
        setMovimientos(Array.isArray(mov) ? mov : [])
        setStockActual(Array.isArray(sa) ? sa : [])
        setEntregas(Array.isArray(ent) ? ent : [])
        setLotes(Array.isArray(lts) ? lts : [])
      } catch (err) {
        console.error(err)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  const pedidosFiltrados = useMemo(() => {
    return todosLosPedidos.filter((p) => {
      if (filtroZona !== "todas" && p.id_zona !== Number(filtroZona)) return false
      if (filtroTransportista !== "todos" && p.id_transportista !== Number(filtroTransportista)) return false
      if (filtroPeriodo !== "todo") {

        const fecha = new Date(p.fecha_pedido.length === 10 ? p.fecha_pedido + "T00:00:00" : p.fecha_pedido)
        const limite = new Date()
        const dias = filtroPeriodo === "semana" ? 7 : filtroPeriodo === "mes" ? 30 : 90
        limite.setDate(limite.getDate() - dias)
        if (fecha < limite) return false
      }
      return true
    })
  }, [todosLosPedidos, filtroZona, filtroTransportista, filtroPeriodo])

  const totalPedidos = pedidosFiltrados.length
  const entregados = pedidosFiltrados.filter((p) => p.estado === "Entregado").length
  const cancelados = pedidosFiltrados.filter((p) => p.estado === "Cancelado").length
  const tasaEntrega = totalPedidos > 0 ? Math.round((entregados / totalPedidos) * 100) : 0
  const totalFacturado = pedidosFiltrados
    .filter((p) => p.estado !== "Cancelado")
    .reduce((acc, p) => acc + Number(p.total), 0)

  const pedidosPorEstado = ESTADOS_ORDEN
    .map((estado) => ({ label: estado, valor: pedidosFiltrados.filter((p) => p.estado === estado).length }))
    .filter((e) => e.valor > 0)

  const enviosDelPeriodo = useMemo(() => {
    const ids = new Set(pedidosFiltrados.map((p) => p.id_pedido))
    return todosLosEnvios.filter((e) => ids.has(e.id_pedido))
  }, [todosLosEnvios, pedidosFiltrados])

  const transportistasFiltrados = transportistas.filter(
    (t) => filtroTransportista === "todos" || t.id_transportista === Number(filtroTransportista)
  )
  const performanceTransportistas = transportistasFiltrados.map((t) => {
    const enviosT = enviosDelPeriodo.filter((e) => e.id_transportista === t.id_transportista)
    const completos = enviosT.filter((e) => e.resultado_entrega === "Entregado").length
    const parciales = enviosT.filter((e) => e.resultado_entrega === "Parcial").length
    const fallidos = enviosT.filter((e) => e.resultado_entrega === "Fallido").length
    const enCursoT = enviosT.filter((e) => !e.resultado_entrega).length
    const total = completos + parciales + fallidos + enCursoT
    const tasa = total > 0 ? Math.round((completos / total) * 100) : 0
    return { nombre: t.nombre + " " + t.apellido, completos, parciales, fallidos, enCurso: enCursoT, total, tasa }
  }).filter((t) => t.total > 0)

  const pedidosPorZona = zonas
    .map((z, idx) => ({
      label: z.nombre,
      valor: pedidosFiltrados.filter((p) => p.id_zona === z.id_zona).length,
      color: COLORES[idx % COLORES.length],
    }))
    .filter((z) => z.valor > 0)

  const lotesEnProceso = lotes.filter(l => l.estado === "En proceso").length
  const lotesFinalizados = lotes.filter(l => l.estado === "Finalizado").length
  const lotesControlados = lotes.filter(l => l.estado === "Controlado").length
  const lotesCancelados = lotes.filter(l => l.estado === "Cancelado").length
  const totalLotes = lotes.length

  const totalEnvios = entregas.length
  const envEntregados = entregas.filter(e => e.resultado_entrega === "Entregado").length
  const envFallidos = entregas.filter(e => e.resultado_entrega === "Fallido").length
  const envParciales = entregas.filter(e => e.resultado_entrega === "Parcial").length
  const envEnCurso = entregas.filter(e => !e.resultado_entrega).length

  const defEstado = useMemo(() => {
    const data = ESTADOS_ORDEN
      .map(e => ({ label: e, valor: pedidosFiltrados.filter(p => p.estado === e).length }))
      .filter(e => e.valor > 0)
    if (!data.length) return null
    const labels = data.map(d => d.label)
    return defineChart({
      marks: [barY(data, { x: "label", y: "valor", color: "label", inset: 2, radius: { end: 4 } })],
      scales: {
        x: { scale: () => scaleBand().padding(0.22) },
        y: { scale: scaleLinear, nice: true, grid: true },
      },
      color: { domain: labels, range: labels.map(l => COLOR_ESTADO_HEX[l] || "#888") },
    })
  }, [pedidosFiltrados])

  const defProducto = useMemo(() => {
    if (!ventasProducto.length) return null
    const names = ventasProducto.map(p => p.nombre)
    return defineChart({
      marks: [barX(ventasProducto, { y: "nombre", x: "total_unidades", color: "nombre", inset: 2, radius: { end: 4 } })],
      scales: {
        y: { scale: () => scaleBand().padding(0.22) },
        x: { scale: scaleLinear, nice: true, grid: true },
      },
      color: { domain: names, range: names.map((_, i) => COLORES_HEX[i % COLORES_HEX.length]) },
    })
  }, [ventasProducto])

  const defTransportistas = useMemo(() => {
    const ids = new Set(pedidosFiltrados.map(p => p.id_pedido))
    const enviosP = todosLosEnvios.filter(e => ids.has(e.id_pedido))
    const transFilt = transportistas.filter(
      t => filtroTransportista === "todos" || t.id_transportista === Number(filtroTransportista)
    )
    const perf = transFilt.map(t => {
      const envT = enviosP.filter(e => e.id_transportista === t.id_transportista)
      return {
        nombre: `${t.nombre} ${t.apellido}`,
        completos: envT.filter(e => e.resultado_entrega === "Entregado").length,
        parciales: envT.filter(e => e.resultado_entrega === "Parcial").length,
        fallidos: envT.filter(e => e.resultado_entrega === "Fallido").length,
        enCurso: envT.filter(e => !e.resultado_entrega).length,
      }
    }).filter(t => t.completos + t.parciales + t.fallidos + t.enCurso > 0)

    if (!perf.length) return null
    const stackData = perf.flatMap(t => [
      { nombre: t.nombre, tipo: "Completo", valor: t.completos },
      { nombre: t.nombre, tipo: "Parcial", valor: t.parciales },
      { nombre: t.nombre, tipo: "En curso", valor: t.enCurso },
      { nombre: t.nombre, tipo: "Fallido", valor: t.fallidos },
    ]).filter(d => d.valor > 0)
    if (!stackData.length) return null
    return defineChart({
      marks: [barY(stackData, {
        x: "nombre", y: "valor", color: "tipo",
        layout: stack({ order: TIPOS_ENVIO }),
        inset: 2,
      })],
      scales: {
        x: { scale: () => scaleBand().padding(0.22) },
        y: { scale: scaleLinear, nice: true, grid: true },
      },
      color: { domain: TIPOS_ENVIO, range: COLORES_TIPOS },
    })
  }, [pedidosFiltrados, todosLosEnvios, transportistas, filtroTransportista])

  const zonasConColor = useMemo(() => {
    const activas = zonas
      .map(z => ({
        ...z,
        provincia: z.provincia || "Córdoba",
        valor: pedidosFiltrados.filter(p => p.id_zona === z.id_zona).length,
      }))
      .filter(z => z.valor > 0)

    const porProvincia = {}
    activas.forEach(z => {
      if (!porProvincia[z.provincia]) porProvincia[z.provincia] = []
      porProvincia[z.provincia].push(z)
    })

    const idxProv = {}
    return activas.map(z => {
      if (idxProv[z.provincia] === undefined) idxProv[z.provincia] = 0
      const base = COLOR_PROVINCIA[z.provincia] || "#888888"
      const tonos = generarTonos(base, porProvincia[z.provincia].length)
      const color = tonos[idxProv[z.provincia]]
      idxProv[z.provincia]++
      return { ...z, color }
    })
  }, [zonas, pedidosFiltrados])

  const defZona = useMemo(() => {
    if (!zonasConColor.length) return null
    const pieDatos = pie(zonasConColor, { value: "valor" })
    return defineChart({
      marks: [
        polar({
          inset: 8,
          radiusRatio: 0.82,
          marks: [
            radialArc(pieDatos, {
              innerRadius: ({ radius }) => radius * 0.55,
              cornerRadius: 4,
              color: "nombre",
              key: "nombre",
            }),
          ],
          scales: { angle: null, radius: null },
        }),
      ],
      scales: { x: null, y: null },
      color: {
        domain: zonasConColor.map(z => z.nombre),
        range: zonasConColor.map(z => z.color),
      },
    })
  }, [zonasConColor])

  const stockOrdenado = useMemo(() => {
    const orden = { critico: 0, bajo: 1, normal: 2 }
    return [...stockActual].sort(
      (a, b) => (orden[a.estado_stock] ?? 3) - (orden[b.estado_stock] ?? 3) || b.stock_actual - a.stock_actual
    )
  }, [stockActual])

  const defStock = useMemo(() => {
    if (!stockOrdenado.length) return null
    const names = stockOrdenado.map(p => p.nombre)
    const colors = stockOrdenado.map(p =>
      p.estado_stock === "critico" ? "#E24B4A" :
        p.estado_stock === "bajo" ? "#EF9F27" : "#15A35A"
    )
    return defineChart({
      marks: [barX(stockOrdenado, { y: "nombre", x: "stock_actual", color: "nombre", inset: 2, radius: { end: 4 } })],
      scales: {
        y: { scale: () => scaleBand().padding(0.22) },
        x: { scale: scaleLinear, nice: true, grid: true },
      },
      color: { domain: names, range: colors },
    })
  }, [stockOrdenado])

  const defLotesEstado = useMemo(() => {
    const ESTADOS_LOTE = [
      { label: "En proceso", color: "#378ADD" },
      { label: "Finalizado", color: "#EF9F27" },
      { label: "Controlado", color: "#15A35A" },
      { label: "Cancelado", color: "#E24B4A" },
    ]
    const data = ESTADOS_LOTE
      .map(e => ({ ...e, valor: lotes.filter(l => l.estado === e.label).length }))
      .filter(e => e.valor > 0)
    if (!data.length) return null
    const pieDatos = pie(data, { value: "valor" })
    return defineChart({
      marks: [polar({
        inset: 8, radiusRatio: 0.82,
        marks: [radialArc(pieDatos, { innerRadius: ({ radius }) => radius * 0.55, cornerRadius: 4, color: "label", key: "label" })],
        scales: { angle: null, radius: null },
      })],
      scales: { x: null, y: null },
      color: { domain: data.map(d => d.label), range: data.map(d => d.color) },
    })
  }, [lotes])

  const defEntregasResultado = useMemo(() => {
    const RESULTADOS = [
      { label: "Entregado", color: "#15A35A" },
      { label: "En curso", color: "#378ADD" },
      { label: "Parcial", color: "#EF9F27" },
      { label: "Fallido", color: "#E24B4A" },
    ]
    const data = RESULTADOS
      .map(r => ({
        ...r,
        valor: r.label === "En curso"
          ? entregas.filter(e => !e.resultado_entrega).length
          : entregas.filter(e => e.resultado_entrega === r.label).length,
      }))
      .filter(r => r.valor > 0)
    if (!data.length) return null
    const pieDatos = pie(data, { value: "valor" })
    return defineChart({
      marks: [polar({
        inset: 8, radiusRatio: 0.82,
        marks: [radialArc(pieDatos, { innerRadius: ({ radius }) => radius * 0.55, cornerRadius: 4, color: "label", key: "label" })],
        scales: { angle: null, radius: null },
      })],
      scales: { x: null, y: null },
      color: { domain: data.map(d => d.label), range: data.map(d => d.color) },
    })
  }, [entregas])

  if (cargando) return <p style={{ padding: "2rem", color: "var(--text-secondary)" }}>Cargando reportes...</p>

  return (
    <div>

      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Reportes y KPIs</h1>
          <p style={estilos.subtitulo}>Análisis de operaciones logísticas</p>
        </div>
        <span style={estilos.resultadosBadge}>
          {totalPedidos} pedido{totalPedidos !== 1 ? "s" : ""} encontrado{totalPedidos !== 1 ? "s" : ""}
        </span>
      </div>

      <div style={estilos.tabs}>
        {[
          { key: "logistica", label: "Logística" },
          { key: "stock", label: `Stock${stockCritico.length > 0 ? ` (${stockCritico.length})` : ""}` },
          { key: "produccion", label: `Producción${lotesPorVencer.length > 0 ? ` (${lotesPorVencer.length})` : ""}` },
          { key: "entregas", label: `Entregas${entregasFallidas.length > 0 ? ` (${entregasFallidas.length})` : ""}` },
        ].map((t) => (
          <button
            key={t.key}
            style={pestana === t.key ? { ...estilos.tab, ...estilos.tabActivo } : estilos.tab}
            onClick={() => setPestana(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {pestana === "logistica" && (
        <>
          <div style={estilos.filtrosBar}>
            <div style={estilos.filtroGrupo}>
              <span style={estilos.filtroLabel}>Período</span>
              <div style={estilos.filtroOpciones}>
                {PERIODOS.map(({ val, lab }) => (
                  <button
                    key={val}
                    style={filtroPeriodo === val ? { ...estilos.filtroBtn, ...estilos.filtroBtnActivo } : estilos.filtroBtn}
                    onClick={() => setFiltroPeriodo(val)}
                  >
                    {lab}
                  </button>
                ))}
              </div>
            </div>
            <div style={estilos.filtroGrupo}>
              <span style={estilos.filtroLabel}>Zona</span>
              <select style={estilos.filtroSelect} value={filtroZona} onChange={(e) => setFiltroZona(e.target.value)}>
                <option value="todas">Todas las zonas</option>
                {zonas.map((z) => <option key={z.id_zona} value={z.id_zona}>{z.nombre}</option>)}
              </select>
            </div>
            <div style={estilos.filtroGrupo}>
              <span style={estilos.filtroLabel}>Transportista</span>
              <select style={estilos.filtroSelect} value={filtroTransportista} onChange={(e) => setFiltroTransportista(e.target.value)}>
                <option value="todos">Todos</option>
                {transportistas.filter((t) => t.activo).map((t) => (
                  <option key={t.id_transportista} value={t.id_transportista}>{t.nombre} {t.apellido}</option>
                ))}
              </select>
            </div>
            {(filtroZona !== "todas" || filtroTransportista !== "todos" || filtroPeriodo !== "todo") && (
              <button style={estilos.btnLimpiar} onClick={() => { setFiltroPeriodo("todo"); setFiltroZona("todas"); setFiltroTransportista("todos") }}>
                ✕ Limpiar filtros
              </button>
            )}
          </div>
          <div style={estilos.grillaTarjetas}>
            <Tarjeta titulo="Total pedidos" valor={totalPedidos} sub="En el período seleccionado" color="var(--azul)" />
            <Tarjeta titulo="Entregados" valor={entregados} sub={`${tasaEntrega}% de cumplimiento`} color="var(--verde)" />
            <Tarjeta titulo="Cancelados" valor={cancelados} sub={`${totalPedidos > 0 ? Math.round((cancelados / totalPedidos) * 100) : 0}% del total`} color="var(--rojo)" />
            <Tarjeta titulo="Facturado" valor={`$${totalFacturado.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="Pedidos no cancelados" color="var(--verde-oscuro)" />
          </div>
          <div style={estilos.grillaGraficos}>
            <div style={estilos.card}>
              <div style={estilos.cardEncabezado}>
                <h2 style={estilos.cardTitulo}>Pedidos por estado</h2>
                <span style={estilos.cardSub}>{totalPedidos} total</span>
              </div>
              {defEstado
                ? <>
                  <Chart definition={defEstado} height={220} ariaLabel="Pedidos por estado" />
                  <div style={estilos.valoresPills}>
                    {pedidosPorEstado.map((e) => (
                      <span key={e.label} style={estilos.valorPill}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: COLOR_ESTADO_HEX[e.label] || "#888", flexShrink: 0 }} />
                        {e.label}: <strong>{e.valor}</strong>
                      </span>
                    ))}
                  </div>
                </>
                : <SinDatos />
              }
            </div>
            <div style={estilos.card}>
              <div style={estilos.cardEncabezado}>
                <h2 style={estilos.cardTitulo}>Unidades vendidas por producto</h2>
                <span style={estilos.cardSub}>pedidos no cancelados</span>
              </div>
              {defProducto
                ? <>
                  <Chart definition={defProducto} height={220} ariaLabel="Unidades vendidas por producto" />
                  <div style={estilos.valoresPills}>
                    {ventasProducto.map((p, i) => (
                      <span key={p.nombre} style={estilos.valorPill}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: COLORES_HEX[i % COLORES_HEX.length], flexShrink: 0 }} />
                        {p.nombre}: <strong>{p.total_unidades} u.</strong>
                      </span>
                    ))}
                  </div>
                </>
                : <SinDatos />
              }
            </div>
            <div style={estilos.card}>
              <div style={estilos.cardEncabezado}>
                <h2 style={estilos.cardTitulo}>Performance de transportistas</h2>
                <span style={estilos.cardSub}>por resultado de envío</span>
              </div>
              <div style={estilos.leyenda}>
                {TIPOS_ENVIO.map((tipo, i) => (
                  <span key={tipo} style={estilos.leyendaItem}>
                    <span style={{ ...estilos.leyendaDot, backgroundColor: COLORES_TIPOS[i] }} />
                    {tipo}
                  </span>
                ))}
              </div>
              {defTransportistas
                ? <>
                  <Chart definition={defTransportistas} height={220} ariaLabel="Performance de transportistas" />
                  <div style={estilos.valoresPills}>
                    {performanceTransportistas.map(t => (
                      <span key={t.nombre} style={estilos.valorPill}>
                        {t.nombre}: <strong>{t.total}</strong> env.
                        {t.tasa > 0 && <span style={{ color: "var(--verde)", marginLeft: 2 }}>({t.tasa}% ok)</span>}
                      </span>
                    ))}
                  </div>
                </>
                : <SinDatos />
              }
            </div>
            <div style={estilos.card}>
              <div style={estilos.cardEncabezado}>
                <h2 style={estilos.cardTitulo}>Pedidos por zona geográfica</h2>
                <span style={estilos.cardSub}>{pedidosPorZona.length} zona{pedidosPorZona.length !== 1 ? "s" : ""} activa{pedidosPorZona.length !== 1 ? "s" : ""}</span>
              </div>
              {defZona
                ? <>
                  <Chart definition={defZona} height={260} ariaLabel="Pedidos por zona geográfica" />
                  <div style={estilos.leyendaDonut}>
                    {(() => {
                      const totalZ = zonasConColor.reduce((s, z) => s + z.valor, 0)

                      const provincias = [...new Set(zonasConColor.map(z => z.provincia))]
                      return provincias.map(prov => {
                        const zonasProv = zonasConColor.filter(z => z.provincia === prov)
                        const baseColor = COLOR_PROVINCIA[prov] || "#888"
                        return (
                          <div key={prov}>
                            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: baseColor, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.3rem", marginTop: "0.4rem" }}>
                              {prov}
                            </div>
                            {zonasProv.map(z => (
                              <div key={z.id_zona} style={{ ...estilos.leyendaDonutFila, paddingLeft: "0.5rem" }}>
                                <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: z.color, flexShrink: 0 }} />
                                <span style={{ flex: 1, color: "var(--text-primary)" }}>{z.nombre}</span>
                                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{z.valor}</span>
                                <span style={{ color: "var(--text-hint)", fontSize: "0.75rem", minWidth: 38, textAlign: "right" }}>
                                  {Math.round(z.valor / totalZ * 100)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )
                      })
                    })()}
                  </div>
                </>
                : <SinDatos />
              }
            </div>
          </div>
        </>
      )}

      {pestana === "stock" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

          <div>
            <TituloSeccion titulo="Niveles de stock por producto" sub={`${stockActual.length} productos`} />
            {defStock
              ? <>
                <div style={estilos.leyenda}>
                  {[["#E24B4A", "Crítico"], ["#EF9F27", "Bajo"], ["#15A35A", "Normal"]].map(([c, l]) => (
                    <span key={l} style={estilos.leyendaItem}>
                      <span style={{ ...estilos.leyendaDot, backgroundColor: c }} />{l}
                    </span>
                  ))}
                </div>
                <Chart definition={defStock} height={Math.max(220, stockOrdenado.length * 40)} ariaLabel="Stock por producto" />
                <div style={estilos.valoresPills}>
                  {stockOrdenado.map(p => {
                    const c = p.estado_stock === "critico" ? "#E24B4A" : p.estado_stock === "bajo" ? "#EF9F27" : "#15A35A"
                    return (
                      <span key={p.nombre} style={estilos.valorPill}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: c, flexShrink: 0 }} />
                        {p.nombre}: <strong>{p.stock_actual} u.</strong>
                      </span>
                    )
                  })}
                </div>
              </>
              : <SinDatos />
            }
          </div>

          <div>
            <TituloSeccion
              titulo="Alertas de stock"
              sub={stockCritico.length === 0 ? "Sin alertas" : `${stockCritico.length} producto${stockCritico.length !== 1 ? "s" : ""} bajo mínimo`}
            />
            {stockCritico.length === 0 ? (
              <p style={estilos.msgOk}>✓ Todos los productos tienen stock suficiente</p>
            ) : (
              <table style={estilos.tabla}>
                <thead><tr style={estilos.thead}>
                  <th style={estilos.th}>Producto</th>
                  <th style={estilos.th}>Código</th>
                  <th style={estilos.th}>Stock actual</th>
                  <th style={estilos.th}>Mínimo</th>
                  <th style={estilos.th}>Crítico</th>
                  <th style={estilos.th}>Faltante</th>
                </tr></thead>
                <tbody>
                  {stockCritico.map((p) => (
                    <tr key={p.id_producto} style={estilos.fila}>
                      <td style={{ ...estilos.td, fontWeight: "600" }}>{p.nombre}</td>
                      <td style={{ ...estilos.td, fontFamily: "monospace", color: "var(--text-secondary)" }}>{p.codigo}</td>
                      <td style={{ ...estilos.td, color: "var(--rojo)", fontWeight: "700" }}>{p.stock_actual}</td>
                      <td style={estilos.td}>{p.stock_minimo}</td>
                      <td style={estilos.td}>{p.stock_critico}</td>
                      <td style={{ ...estilos.td, color: "var(--rojo)", fontWeight: "700" }}>{p.faltante}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div>
            <TituloSeccion titulo="Movimientos de stock recientes" sub="últimos 100" />
            {movimientos.length === 0 ? <SinDatos /> : (
              <table style={estilos.tabla}>
                <thead><tr style={estilos.thead}>
                  <th style={estilos.th}>Fecha</th>
                  <th style={estilos.th}>Entidad</th>
                  <th style={estilos.th}>Tipo</th>
                  <th style={estilos.th}>Cantidad</th>
                  <th style={estilos.th}>Anterior</th>
                  <th style={estilos.th}>Nuevo</th>
                  <th style={estilos.th}>Referencia</th>
                  <th style={estilos.th}>Usuario</th>
                </tr></thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.id_movimiento} style={estilos.fila}>
                      <td style={{ ...estilos.td, color: "var(--text-secondary)", fontSize: "0.78rem" }}>{m.fecha}</td>
                      <td style={{ ...estilos.td, fontWeight: "600" }}>{m.nombre_entidad}</td>
                      <td style={estilos.td}>
                        <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-full)", backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border)" }}>
                          {m.tipo_movimiento}
                        </span>
                      </td>
                      <td style={{ ...estilos.td, fontWeight: "700", color: m.cantidad > 0 ? "var(--verde-oscuro)" : "var(--rojo)" }}>
                        {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                      </td>
                      <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{m.stock_anterior}</td>
                      <td style={{ ...estilos.td, fontWeight: "600" }}>{m.stock_nuevo}</td>
                      <td style={{ ...estilos.td, fontFamily: "monospace", color: "var(--text-secondary)" }}>{m.referencia || "—"}</td>
                      <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{m.usuario || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {pestana === "produccion" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

          <div>
            <TituloSeccion titulo="Distribución por estado" sub={`${totalLotes} lote${totalLotes !== 1 ? "s" : ""} en total`} />
            {defLotesEstado
              ? <>
                <Chart definition={defLotesEstado} height={240} ariaLabel="Distribución de lotes por estado" />
                <div style={estilos.leyendaDonut}>
                  {[
                    { label: "En proceso", valor: lotesEnProceso, color: "#378ADD" },
                    { label: "Finalizado", valor: lotesFinalizados, color: "#EF9F27" },
                    { label: "Controlado", valor: lotesControlados, color: "#15A35A" },
                    { label: "Cancelado", valor: lotesCancelados, color: "#E24B4A" },
                  ].filter(e => e.valor > 0).map(e => (
                    <div key={e.label} style={estilos.leyendaDonutFila}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: e.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: "var(--text-primary)" }}>{e.label}</span>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{e.valor}</span>
                      <span style={{ color: "var(--text-hint)", fontSize: "0.75rem", minWidth: 38, textAlign: "right" }}>
                        {Math.round(e.valor / totalLotes * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
              : <SinDatos />
            }
          </div>

          <div>
            <TituloSeccion
              titulo="Lotes próximos a vencer (60 días)"
              sub={lotesPorVencer.length === 0 ? "Sin alertas" : `${lotesPorVencer.length} lote${lotesPorVencer.length !== 1 ? "s" : ""}`}
            />
            {lotesPorVencer.length === 0 ? (
              <p style={estilos.msgOk}>✓ No hay lotes próximos a vencer</p>
            ) : (
              <table style={estilos.tabla}>
                <thead><tr style={estilos.thead}>
                  <th style={estilos.th}>Lote</th>
                  <th style={estilos.th}>Producto</th>
                  <th style={estilos.th}>Cantidad</th>
                  <th style={estilos.th}>Vence</th>
                  <th style={estilos.th}>Días restantes</th>
                  <th style={estilos.th}>Estado</th>
                </tr></thead>
                <tbody>
                  {lotesPorVencer.map((l) => (
                    <tr key={l.id_lote} style={estilos.fila}>
                      <td style={{ ...estilos.td, fontFamily: "monospace", fontWeight: "600" }}>{l.nro_lote}</td>
                      <td style={estilos.td}>{l.producto}</td>
                      <td style={estilos.td}>{l.cantidad_producida}</td>
                      <td style={estilos.td}>{l.fecha_vencimiento}</td>
                      <td style={estilos.td}>
                        <span style={{ fontWeight: "700", color: l.dias_restantes <= 15 ? "var(--rojo)" : l.dias_restantes <= 30 ? "var(--naranja)" : "var(--text-primary)" }}>
                          {l.dias_restantes} días
                        </span>
                      </td>
                      <td style={estilos.td}>{l.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div>
            <TituloSeccion titulo="Todos los lotes de producción" sub={`${lotes.length} lote${lotes.length !== 1 ? "s" : ""}`} />
            {lotes.length === 0 ? <SinDatos /> : (
              <table style={estilos.tabla}>
                <thead><tr style={estilos.thead}>
                  <th style={estilos.th}>Lote</th>
                  <th style={estilos.th}>Producto</th>
                  <th style={estilos.th}>Cantidad</th>
                  <th style={estilos.th}>Elaboración</th>
                  <th style={estilos.th}>Vencimiento</th>
                  <th style={estilos.th}>Estado</th>
                  <th style={estilos.th}>Operario</th>
                  <th style={estilos.th}>Observaciones</th>
                </tr></thead>
                <tbody>
                  {lotes.map((l) => {
                    const col = { "En proceso": { bg: "var(--azul-claro)", color: "var(--azul)" }, "Finalizado": { bg: "var(--naranja-claro, #fff3e0)", color: "var(--naranja)" }, "Controlado": { bg: "var(--verde-claro)", color: "var(--verde-oscuro)" }, "Cancelado": { bg: "var(--rojo-claro)", color: "var(--rojo)" } }[l.estado] || {}
                    return (
                      <tr key={l.id_lote} style={estilos.fila}>
                        <td style={{ ...estilos.td, fontFamily: "monospace", fontWeight: "600" }}>{l.nro_lote}</td>
                        <td style={estilos.td}>{l.producto}</td>
                        <td style={estilos.td}>{l.cantidad_producida}</td>
                        <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{l.fecha_elaboracion}</td>
                        <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{l.fecha_vencimiento}</td>
                        <td style={estilos.td}>
                          <span style={{ fontSize: "0.72rem", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontWeight: "600", backgroundColor: col.bg, color: col.color }}>
                            {l.estado}
                          </span>
                        </td>
                        <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{l.operario}</td>
                        <td style={{ ...estilos.td, color: "var(--text-secondary)", fontSize: "0.8rem", fontStyle: l.observaciones ? "normal" : "italic" }}>
                          {l.observaciones || "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {pestana === "entregas" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>

          <div>
            <TituloSeccion titulo="Resultados de entrega" sub={`${totalEnvios} envío${totalEnvios !== 1 ? "s" : ""} en total`} />
            {defEntregasResultado
              ? <>
                <Chart definition={defEntregasResultado} height={240} ariaLabel="Resultados de entrega" />
                <div style={estilos.leyendaDonut}>
                  {[
                    { label: "Entregado", valor: envEntregados, color: "#15A35A" },
                    { label: "En curso", valor: envEnCurso, color: "#378ADD" },
                    { label: "Parcial", valor: envParciales, color: "#EF9F27" },
                    { label: "Fallido", valor: envFallidos, color: "#E24B4A" },
                  ].filter(e => e.valor > 0).map(e => (
                    <div key={e.label} style={estilos.leyendaDonutFila}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: e.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: "var(--text-primary)" }}>{e.label}</span>
                      <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{e.valor}</span>
                      <span style={{ color: "var(--text-hint)", fontSize: "0.75rem", minWidth: 38, textAlign: "right" }}>
                        {Math.round(e.valor / totalEnvios * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
              : <SinDatos />
            }
          </div>

          <div>
            <TituloSeccion
              titulo="Entregas fallidas o parciales"
              sub={entregasFallidas.length === 0 ? "Sin registros" : `${entregasFallidas.length} registro${entregasFallidas.length !== 1 ? "s" : ""}`}
            />
            {entregasFallidas.length === 0 ? (
              <p style={estilos.msgOk}>✓ No hay entregas fallidas o parciales</p>
            ) : (
              <table style={estilos.tabla}>
                <thead><tr style={estilos.thead}>
                  <th style={estilos.th}>Pedido</th>
                  <th style={estilos.th}>Cliente</th>
                  <th style={estilos.th}>Transportista</th>
                  <th style={estilos.th}>Resultado</th>
                  <th style={estilos.th}>Fecha</th>
                  <th style={estilos.th}>Observaciones</th>
                </tr></thead>
                <tbody>
                  {entregasFallidas.map((e) => (
                    <tr key={e.id_envio} style={estilos.fila}>
                      <td style={{ ...estilos.td, fontWeight: "600" }}>{e.nro_pedido}</td>
                      <td style={estilos.td}>{e.cliente}</td>
                      <td style={estilos.td}>{e.transportista}</td>
                      <td style={estilos.td}>
                        <span style={{ fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontWeight: "600", backgroundColor: e.resultado_entrega === "Fallido" ? "var(--rojo-claro)" : "var(--naranja-claro, #fff3e0)", color: e.resultado_entrega === "Fallido" ? "var(--rojo)" : "var(--naranja)" }}>
                          {e.resultado_entrega}
                        </span>
                      </td>
                      <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{e.fecha_entrega || "—"}</td>
                      <td style={{ ...estilos.td, color: "var(--text-secondary)", fontSize: "0.8rem" }}>{e.observaciones || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div>
            <TituloSeccion
              titulo="Pedidos cancelados"
              sub={pedidosCancelados.length === 0 ? "Sin registros" : `${pedidosCancelados.length} pedido${pedidosCancelados.length !== 1 ? "s" : ""}`}
            />
            {pedidosCancelados.length === 0 ? (
              <p style={estilos.msgOk}>✓ No hay pedidos cancelados</p>
            ) : (
              <table style={estilos.tabla}>
                <thead><tr style={estilos.thead}>
                  <th style={estilos.th}>Pedido</th>
                  <th style={estilos.th}>Cliente</th>
                  <th style={estilos.th}>Fecha</th>
                  <th style={estilos.th}>Estado previo</th>
                  <th style={estilos.th}>Motivo / Observación</th>
                </tr></thead>
                <tbody>
                  {pedidosCancelados.map((p) => (
                    <tr key={p.id_pedido} style={estilos.fila}>
                      <td style={{ ...estilos.td, fontWeight: "600" }}>{p.nro_pedido}</td>
                      <td style={estilos.td}>{p.cliente}</td>
                      <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{p.fecha_pedido}</td>
                      <td style={estilos.td}>{p.estado_previo || "—"}</td>
                      <td style={{ ...estilos.td, color: "var(--text-secondary)", fontSize: "0.8rem" }}>{p.motivo || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Tarjeta({ titulo, valor, sub, color }) {
  return (
    <div style={estilos.tarjeta}>
      <div style={{ ...estilos.tarjetaBarra, backgroundColor: color }} />
      <div style={estilos.tarjetaCuerpo}>
        <p style={estilos.tarjetaTitulo}>{titulo}</p>
        <p style={estilos.tarjetaValor}>{valor}</p>
        <p style={estilos.tarjetaSub}>{sub}</p>
      </div>
    </div>
  )
}

function SinDatos() {
  return (
    <p style={{ fontSize: "0.875rem", color: "var(--text-hint)", textAlign: "center", padding: "2rem 0" }}>
      Sin datos para los filtros seleccionados
    </p>
  )
}

function TituloSeccion({ titulo, sub }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingBottom: "0.6rem", borderBottom: "2px solid var(--border)", marginBottom: "1rem" }}>
      <h2 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>{titulo}</h2>
      {sub && <span style={{ fontSize: "0.72rem", color: "var(--text-hint)" }}>{sub}</span>}
    </div>
  )
}

const estilos = {
  ...estilosComunes,
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  resultadosBadge: { fontSize: "0.8rem", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border)", borderRadius: "var(--radius-full)", padding: "0.35rem 0.85rem", fontWeight: "500" },
  filtrosBar: { display: "flex", gap: "1.5rem", alignItems: "flex-end", flexWrap: "wrap", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "1rem 1.25rem", marginBottom: "1.5rem", boxShadow: "var(--shadow-sm)" },
  filtroGrupo: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  filtroLabel: { fontSize: "0.72rem", fontWeight: "700", color: "var(--text-hint)", textTransform: "uppercase", letterSpacing: "0.5px" },
  filtroOpciones: { display: "flex", gap: "0.3rem" },
  filtroBtn: { padding: "0.4rem 0.85rem", borderRadius: "var(--radius-md)", fontSize: "0.8rem", border: "1.5px solid var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)", cursor: "pointer", fontWeight: "500" },
  filtroBtnActivo: { backgroundColor: "var(--verde-claro)", border: "1.5px solid var(--verde)", color: "var(--verde-oscuro)", fontWeight: "700" },
  filtroSelect: { padding: "0.4rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.8rem", border: "1.5px solid var(--border)", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)", cursor: "pointer", minWidth: "160px" },
  btnLimpiar: { alignSelf: "flex-end", padding: "0.4rem 0.85rem", borderRadius: "var(--radius-md)", fontSize: "0.78rem", border: "1.5px solid var(--rojo)", color: "var(--rojo)", backgroundColor: "var(--rojo-claro)", cursor: "pointer", fontWeight: "600" },
  grillaTarjetas: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" },
  tarjeta: { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", overflow: "hidden", border: "1px solid var(--border)" },
  tarjetaBarra: { height: "4px" },
  tarjetaCuerpo: { padding: "1.1rem 1.25rem" },
  tarjetaTitulo: { fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: "500", marginBottom: "0.5rem" },
  tarjetaValor: { fontSize: "1.9rem", fontWeight: "800", color: "var(--text-primary)", lineHeight: 1, marginBottom: "0.4rem" },
  tarjetaSub: { fontSize: "0.72rem", color: "var(--text-hint)" },
  grillaGraficos: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  card: { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", padding: "1.25rem", border: "1px solid var(--border)" },
  cardEncabezado: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" },
  cardTitulo: { fontSize: "0.92rem", fontWeight: "700", color: "var(--text-primary)" },
  cardSub: { fontSize: "0.72rem", color: "var(--text-hint)" },
  grafico: { display: "flex", flexDirection: "column", gap: "0.9rem" },
  barraFila: { display: "flex", alignItems: "center", gap: "0.75rem" },
  barraLabel: { fontSize: "0.76rem", color: "var(--text-secondary)", width: "115px", flexShrink: 0, lineHeight: 1.3 },
  barraContenedor: { flex: 1, backgroundColor: "var(--bg-surface-3)", borderRadius: "var(--radius-sm)", height: "10px", overflow: "hidden" },
  barra: { height: "100%", borderRadius: "var(--radius-sm)", transition: "width 0.35s ease" },
  barraValor: { fontSize: "0.76rem", fontWeight: "600", color: "var(--text-primary)", minWidth: "60px", textAlign: "right", flexShrink: 0 },
  leyenda: { display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" },
  leyendaItem: { display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.72rem", color: "var(--text-secondary)" },
  leyendaDot: { width: "10px", height: "10px", borderRadius: "2px", flexShrink: 0 },
  leyendaDonut: { display: "flex", flexDirection: "column", gap: "0.45rem", marginTop: "0.75rem", borderTop: "1px solid var(--border)", paddingTop: "0.75rem" },
  leyendaDonutFila: { display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" },
  valoresPills: { display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.6rem", borderTop: "1px solid var(--border)", paddingTop: "0.6rem" },
  valorPill: { display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", padding: "0.2rem 0.5rem", borderRadius: "var(--radius-sm)", backgroundColor: "var(--bg-surface-2)", color: "var(--text-secondary)" },
  productoImg: { width: "28px", height: "32px", objectFit: "contain", flexShrink: 0, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" },
  tabs: { display: "flex", gap: "0.4rem", marginBottom: "1.5rem" },
  tab: { padding: "0.5rem 1.1rem", borderRadius: "var(--radius-md)", fontSize: "0.82rem", border: "1.5px solid var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface-2)", cursor: "pointer", fontWeight: "500" },
  tabActivo: { backgroundColor: "var(--verde-claro)", border: "1.5px solid var(--verde)", color: "var(--verde-oscuro)", fontWeight: "700" },
  tabla: { width: "100%", borderCollapse: "collapse", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border)" },
  msgOk: { fontSize: "0.875rem", color: "var(--verde-oscuro)", textAlign: "center", padding: "2rem 0", fontWeight: "600", margin: 0 },
}