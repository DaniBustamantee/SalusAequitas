import { useState, useEffect, useRef } from "react"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { useToast } from "../../context/ToastContext"

const ETIQUETA = { producto: "Producto", materia_prima: "Materia Prima", insumo: "Insumo" }
const COLOR_TIPO = {
  producto:      { bg: "var(--azul-claro,#e8f0fe)",    color: "var(--azul)" },
  materia_prima: { bg: "var(--verde-claro)",            color: "var(--verde-oscuro)" },
  insumo:        { bg: "var(--naranja-claro)",          color: "var(--naranja)" },
}

const CATEGORIAS = [
  { key: "productos",       label: "Productos terminados", color: COLOR_TIPO.producto },
  { key: "materias_primas", label: "Materias Primas",      color: COLOR_TIPO.materia_prima },
  { key: "insumos",         label: "Insumos",              color: COLOR_TIPO.insumo },
]

function CheckboxCategoria({ allSelected, noneSelected, onChange, style }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !allSelected && !noneSelected
  }, [allSelected, noneSelected])
  return (
    <input ref={ref} type="checkbox" checked={allSelected} onChange={onChange} style={style} />
  )
}

export default function ActualizadorPrecios() {
  const { mostrarToast } = useToast()
  const [tab, setTab]         = useState("actualizar")

  const [tipo, setTipo]       = useState("porcentual")
  const [pct,  setPct]        = useState("")
  const [dolarAnt, setDolarAnt] = useState("")
  const [dolarNvo, setDolarNvo] = useState("")
  const [notas, setNotas]     = useState("")
  const [seleccionados, setSeleccionados] = useState({ productos: new Set(), materias_primas: new Set(), insumos: new Set() })
  const [expandido, setExpandido] = useState({ productos: false, materias_primas: false, insumos: false })
  const [entidades, setEntidades] = useState(null)
  const [cargando, setCargando]   = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [preview, setPreview]     = useState(false)
  const [modalConfirm, setModalConfirm] = useState(false)

  const [historial, setHistorial]       = useState([])
  const [cargandoHist, setCargandoHist] = useState(false)
  const [filtroTipoH, setFiltroTipoH]   = useState("todos")

  async function cargarEntidades() {
    setCargando(true)
    try {
      const res  = await fetchAuth(`${API_URL}/precios/entidades`)
      const data = await res.json()
      setEntidades(data)
    } finally {
      setCargando(false)
    }
  }

  async function cargarHistorial() {
    setCargandoHist(true)
    try {
      const res  = await fetchAuth(`${API_URL}/precios/historial`)
      const data = await res.json()
      setHistorial(Array.isArray(data) ? data : [])
    } finally {
      setCargandoHist(false)
    }
  }

  useEffect(() => { cargarEntidades() }, [])
  useEffect(() => { if (tab === "historial") cargarHistorial() }, [tab])

  useEffect(() => {
    if (entidades) {
      setSeleccionados({
        productos:       new Set(entidades.productos.map(p => p.id)),
        materias_primas: new Set(entidades.materias_primas.map(m => m.id)),
        insumos:         new Set(entidades.insumos.map(i => i.id)),
      })
    }
  }, [entidades])

  function toggleItem(cat, id) {
    setSeleccionados(prev => {
      const next = new Set(prev[cat])
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { ...prev, [cat]: next }
    })
    setPreview(false)
  }

  function toggleCategoria(cat) {
    if (!entidades) return
    setSeleccionados(prev => {
      const todos = entidades[cat].map(i => i.id)
      const todosSeleccionados = todos.length > 0 && todos.every(id => prev[cat].has(id))
      return { ...prev, [cat]: todosSeleccionados ? new Set() : new Set(todos) }
    })
    setPreview(false)
  }

  function pctCalculado() {
    if (tipo === "porcentual") return Number(pct) || 0
    const ant = Number(dolarAnt)
    const nvo = Number(dolarNvo)
    if (!ant || !nvo || ant <= 0) return 0
    return ((nvo - ant) / ant) * 100
  }

  function precioNuevo(precio) {
    const factor = 1 + pctCalculado() / 100
    return Math.round(precio * factor * 100) / 100
  }

  function filasPrevisualizacion() {
    if (!entidades) return []
    const filas = []
    entidades.productos.filter(p => seleccionados.productos.has(p.id)).forEach(p => filas.push({ ...p, tipo_entidad: "producto" }))
    entidades.materias_primas.filter(m => seleccionados.materias_primas.has(m.id)).forEach(m => filas.push({ ...m, tipo_entidad: "materia_prima" }))
    entidades.insumos.filter(i => seleccionados.insumos.has(i.id)).forEach(i => filas.push({ ...i, tipo_entidad: "insumo" }))
    return filas
  }

  function pctValido() {
    if (tipo === "porcentual") return pct !== "" && !isNaN(Number(pct))
    return dolarAnt !== "" && dolarNvo !== "" && Number(dolarAnt) > 0 && Number(dolarNvo) > 0
  }

  function totalSeleccionados() {
    return seleccionados.productos.size + seleccionados.materias_primas.size + seleccionados.insumos.size
  }

  async function handleAplicar() {
    if (!pctValido()) return
    if (guardando) return
    setGuardando(true)
    try {
      const body = {
        tipo,
        notas,
        ids_productos:       Array.from(seleccionados.productos),
        ids_materias_primas: Array.from(seleccionados.materias_primas),
        ids_insumos:         Array.from(seleccionados.insumos),
        ...(tipo === "porcentual"
          ? { porcentaje: Number(pct) }
          : { dolar_anterior: Number(dolarAnt), dolar_nuevo: Number(dolarNvo) }
        ),
      }
      const res  = await fetchAuth(`${API_URL}/precios/actualizar`, { method: "POST", body: JSON.stringify(body) })
      const data = await res.json()
      if (res.ok) {
        mostrarToast(`✓ ${data.total} precios actualizados (${pctCalculado() >= 0 ? "+" : ""}${pctCalculado().toFixed(2)}%)`, "exito")
        setPct(""); setDolarAnt(""); setDolarNvo(""); setNotas(""); setPreview(false); setModalConfirm(false)
        await cargarEntidades()
      } else {
        mostrarToast(data.error || "Error al actualizar precios", "error")
      }
    } finally {
      setGuardando(false)
    }
  }

  const filas   = filasPrevisualizacion()
  const pctReal = pctCalculado()

  return (
    <div>

      {modalConfirm && (
        <div style={estilos.overlay} onClick={() => !guardando && setModalConfirm(false)}>
          <div style={estilos.modal} onClick={(ev) => ev.stopPropagation()}>
            <h2 style={estilos.modalTitulo}>Confirmar actualización de precios</h2>
            <p style={estilos.modalDesc}>
              Estás por actualizar <strong>{filas.length} precios</strong> con un ajuste de{" "}
              <strong style={{ color: pctReal >= 0 ? "var(--verde-oscuro)" : "var(--rojo)" }}>
                {pctReal >= 0 ? "+" : ""}{pctReal.toFixed(2)}%
              </strong>.
            </p>
            <p style={estilos.modalDesc}>
              Esta acción modificará los precios actuales. El cambio quedará registrado en el historial.
            </p>
            <div style={estilos.modalResumen}>
              {seleccionados.productos.size > 0 && (
                <span style={estilos.modalChip}>{seleccionados.productos.size} productos</span>
              )}
              {seleccionados.materias_primas.size > 0 && (
                <span style={{ ...estilos.modalChip, backgroundColor: "var(--verde-claro)", color: "var(--verde-oscuro)" }}>
                  {seleccionados.materias_primas.size} materias primas
                </span>
              )}
              {seleccionados.insumos.size > 0 && (
                <span style={{ ...estilos.modalChip, backgroundColor: "var(--naranja-claro)", color: "var(--naranja)" }}>
                  {seleccionados.insumos.size} insumos
                </span>
              )}
            </div>
            <div style={estilos.modalBotones}>
              <button style={estilos.botonSecundario} onClick={() => setModalConfirm(false)} disabled={guardando}>
                Cancelar
              </button>
              <button
                style={{ ...estilos.botonPrimario, opacity: guardando ? 0.6 : 1, minWidth: "160px" }}
                onClick={handleAplicar}
                disabled={guardando}
              >
                {guardando ? "Aplicando..." : "Sí, actualizar precios"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Actualización de Precios</h1>
          <p style={estilos.subtitulo}>Actualizá precios por porcentaje o variación del dólar con historial completo</p>
        </div>
      </div>

      <div style={estilos.tabs}>
        {[["actualizar", "Actualizador"], ["historial", "Historial de cambios"]].map(([k, label]) => (
          <button key={k} style={tab === k ? { ...estilos.tab, ...estilos.tabActivo } : estilos.tab} onClick={() => setTab(k)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "actualizar" && (
        <div style={estilos.grilla}>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

            <div style={estilos.card}>
              <h2 style={estilos.cardTitulo}>Método de actualización</h2>
              <div style={estilos.toggleRow}>
                <button
                  style={tipo === "porcentual" ? { ...estilos.toggleBtn, ...estilos.toggleActivo } : estilos.toggleBtn}
                  onClick={() => setTipo("porcentual")}
                >
                  % Porcentaje
                </button>
                <button
                  style={tipo === "dolar" ? { ...estilos.toggleBtn, ...estilos.toggleActivo } : estilos.toggleBtn}
                  onClick={() => setTipo("dolar")}
                >
                  $ Dólar
                </button>
              </div>

              {tipo === "porcentual" ? (
                <div style={{ marginTop: "1rem" }}>
                  <label style={estilos.label}>Porcentaje de ajuste</label>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      style={{ ...estilos.input, width: "140px" }}
                      type="number"
                      step="0.5"
                      placeholder="Ej: 10 o -5"
                      value={pct}
                      onChange={(ev) => { setPct(ev.target.value); setPreview(false) }}
                    />
                    <span style={estilos.hint}>%</span>
                  </div>
                  {pct !== "" && !isNaN(Number(pct)) && (
                    <p style={{ ...estilos.hint, marginTop: "0.4rem" }}>
                      Un precio de $1.000 quedaría en <strong>${(1000 * (1 + Number(pct)/100)).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div>
                    <label style={estilos.label}>Dólar anterior ($)</label>
                    <input style={estilos.input} type="number" min="1" placeholder="Ej: 800" value={dolarAnt}
                      onChange={(ev) => { setDolarAnt(ev.target.value); setPreview(false) }} />
                  </div>
                  <div>
                    <label style={estilos.label}>Dólar nuevo ($)</label>
                    <input style={estilos.input} type="number" min="1" placeholder="Ej: 1000" value={dolarNvo}
                      onChange={(ev) => { setDolarNvo(ev.target.value); setPreview(false) }} />
                  </div>
                  {dolarAnt && dolarNvo && Number(dolarAnt) > 0 && Number(dolarNvo) > 0 && (
                    <div style={{ gridColumn: "1/-1" }}>
                      <p style={{ ...estilos.hint, color: pctReal >= 0 ? "var(--verde-oscuro)" : "var(--rojo)" }}>
                        Variación calculada: <strong>{pctReal >= 0 ? "+" : ""}{pctReal.toFixed(2)}%</strong>
                        {" · "}Un precio de $1.000 quedaría en <strong>${(1000 * (1 + pctReal/100)).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={estilos.card}>
              <h2 style={estilos.cardTitulo}>
                ¿Qué actualizar?
                {entidades && (
                  <span style={{ fontSize: "0.75rem", fontWeight: "500", color: "var(--text-hint)", marginLeft: "0.5rem" }}>
                    {totalSeleccionados()} seleccionado{totalSeleccionados() !== 1 ? "s" : ""}
                  </span>
                )}
              </h2>
              {cargando ? (
                <p style={{ ...estilos.hint, textAlign: "center", padding: "0.75rem 0" }}>Cargando...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
                  {CATEGORIAS.map(({ key, label, color }) => {
                    const items   = entidades?.[key] || []
                    const sel     = seleccionados[key]
                    const allSel  = items.length > 0 && items.every(i => sel.has(i.id))
                    const noneSel = items.length === 0 || items.every(i => !sel.has(i.id))
                    const exp     = expandido[key]
                    return (
                      <div key={key} style={estilos.catBloque}>
                        
                        <div style={estilos.catHeader}>
                          <CheckboxCategoria
                            allSelected={allSel}
                            noneSelected={noneSel}
                            onChange={() => toggleCategoria(key)}
                            style={{ width: "15px", height: "15px", cursor: "pointer", flexShrink: 0 }}
                          />
                          <span style={{ ...estilos.badge, backgroundColor: color.bg, color: color.color }}>{label}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-hint)", marginLeft: "auto" }}>
                            {sel.size}/{items.length}
                          </span>
                          <button
                            style={estilos.catToggleBtn}
                            onClick={() => setExpandido(prev => ({ ...prev, [key]: !prev[key] }))}
                          >
                            {exp ? "▲" : "▼"}
                          </button>
                        </div>
                       
                        {exp && (
                          <div style={estilos.catItems}>
                            {items.length === 0 ? (
                              <p style={{ ...estilos.hint, padding: "0.5rem 0.75rem" }}>Sin ítems</p>
                            ) : items.map(item => (
                              <label key={item.id} style={estilos.itemRow}>
                                <input
                                  type="checkbox"
                                  checked={sel.has(item.id)}
                                  onChange={() => toggleItem(key, item.id)}
                                  style={{ width: "14px", height: "14px", cursor: "pointer", flexShrink: 0 }}
                                />
                                <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {item.nombre}
                                </span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-hint)", flexShrink: 0, marginLeft: "0.4rem" }}>
                                  ${Number(item.precio).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={estilos.card}>
              <h2 style={estilos.cardTitulo}>Motivo (opcional)</h2>
              <input
                style={{ ...estilos.input, marginTop: "0.5rem" }}
                placeholder="Ej: Ajuste por inflación octubre, variación dólar blue..."
                value={notas}
                onChange={(ev) => setNotas(ev.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={estilos.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={estilos.cardTitulo}>
                  {preview ? `Vista previa (${filas.length} ítems)` : "Vista previa"}
                </h2>
                <button
                  style={{ ...estilos.botonSecundario, opacity: pctValido() ? 1 : 0.5 }}
                  onClick={() => pctValido() && setPreview(true)}
                  disabled={!pctValido()}
                >
                  Ver preview
                </button>
              </div>

              {!preview && (
                <p style={{ ...estilos.hint, textAlign: "center", padding: "1.5rem 0" }}>
                  Configurá el método y hacé clic en "Ver preview" para ver los nuevos precios antes de confirmar.
                </p>
              )}

              {preview && filas.length === 0 && (
                <p style={{ ...estilos.hint, textAlign: "center", padding: "1.5rem 0" }}>
                  No hay ítems seleccionados.
                </p>
              )}

              {preview && filas.length > 0 && (
                <div style={{ maxHeight: "340px", overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={estilos.thead}>
                        <th style={estilos.th}>Nombre</th>
                        <th style={estilos.th}>Tipo</th>
                        <th style={{ ...estilos.th, textAlign: "right" }}>Precio actual</th>
                        <th style={{ ...estilos.th, textAlign: "right" }}>Precio nuevo</th>
                        <th style={{ ...estilos.th, textAlign: "right" }}>Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map((f, idx) => {
                        const nvo  = precioNuevo(f.precio)
                        const diff = nvo - f.precio
                        const col  = COLOR_TIPO[f.tipo_entidad]
                        return (
                          <tr key={idx} style={estilos.fila}>
                            <td style={estilos.td}>{f.nombre}</td>
                            <td style={estilos.td}>
                              <span style={{ ...estilos.badge, backgroundColor: col.bg, color: col.color }}>
                                {ETIQUETA[f.tipo_entidad]}
                              </span>
                            </td>
                            <td style={{ ...estilos.td, textAlign: "right", color: "var(--text-secondary)" }}>
                              ${Number(f.precio).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ ...estilos.td, textAlign: "right", fontWeight: "700" }}>
                              ${nvo.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td style={{ ...estilos.td, textAlign: "right", color: diff >= 0 ? "var(--verde-oscuro)" : "var(--rojo)", fontWeight: "600" }}>
                              {diff >= 0 ? "+" : ""}${diff.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {preview && filas.length > 0 && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    Se actualizarán <strong>{filas.length}</strong> precios con un ajuste de{" "}
                    <strong style={{ color: pctReal >= 0 ? "var(--verde-oscuro)" : "var(--rojo)" }}>
                      {pctReal >= 0 ? "+" : ""}{pctReal.toFixed(2)}%
                    </strong>
                  </p>
                  <button style={estilos.botonPrimario} onClick={() => setModalConfirm(true)}>
                    Confirmar actualización
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "historial" && (
        <div>
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem" }}>
            {["todos", "porcentual", "dolar"].map((f) => (
              <button
                key={f}
                style={filtroTipoH === f ? { ...estilos.filtro, ...estilos.filtroActivo } : estilos.filtro}
                onClick={() => setFiltroTipoH(f)}
              >
                {f === "todos" ? "Todos" : f === "porcentual" ? "Porcentual" : "Dólar"}
              </button>
            ))}
          </div>

          <div style={estilos.tablaWrap}>
            {cargandoHist ? (
              <p style={{ padding: "2rem", textAlign: "center", color: "var(--text-hint)" }}>Cargando historial...</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={estilos.thead}>
                    <th style={estilos.th}>Fecha</th>
                    <th style={estilos.th}>Entidad</th>
                    <th style={estilos.th}>Tipo</th>
                    <th style={estilos.th}>Ajuste aplicado</th>
                    <th style={{ ...estilos.th, textAlign: "right" }}>Precio anterior</th>
                    <th style={{ ...estilos.th, textAlign: "right" }}>Precio nuevo</th>
                    <th style={estilos.th}>Usuario</th>
                    <th style={estilos.th}>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {historial
                    .filter(h => filtroTipoH === "todos" || h.tipo_actualizacion === filtroTipoH)
                    .map((h) => {
                      const col  = COLOR_TIPO[h.tipo_entidad] || {}
                      return (
                        <tr key={h.id_historial} style={estilos.fila}>
                          <td style={{ ...estilos.td, fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                            {h.fecha_actualizacion?.replace("T", " ")}
                          </td>
                          <td style={estilos.td}>{h.nombre_entidad}</td>
                          <td style={estilos.td}>
                            <span style={{ ...estilos.badge, backgroundColor: col.bg, color: col.color }}>
                              {ETIQUETA[h.tipo_entidad] || h.tipo_entidad}
                            </span>
                          </td>
                          <td style={{ ...estilos.td, fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                            {h.valor_referencia}
                          </td>
                          <td style={{ ...estilos.td, textAlign: "right", color: "var(--text-secondary)" }}>
                            ${Number(h.precio_anterior).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ ...estilos.td, textAlign: "right", fontWeight: "700" }}>
                            ${Number(h.precio_nuevo).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td style={{ ...estilos.td, fontSize: "0.82rem" }}>{h.usuario || "—"}</td>
                          <td style={{ ...estilos.td, fontSize: "0.78rem", color: "var(--text-secondary)", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {h.notas || "—"}
                          </td>
                        </tr>
                      )
                    })}
                  {historial.filter(h => filtroTipoH === "todos" || h.tipo_actualizacion === filtroTipoH).length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem" }}>
                        No hay registros de cambios de precios aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const estilos = {
  encabezado:  { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" },
  titulo:      { fontSize: "1.65rem", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.3px" },
  subtitulo:   { fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.3rem" },
  tabs:        { display: "flex", gap: "0.25rem", marginBottom: "1.5rem", borderBottom: "2px solid var(--border)", paddingBottom: "0" },
  tab:         { padding: "0.6rem 1.2rem", fontSize: "0.875rem", fontWeight: "500", color: "var(--text-secondary)", cursor: "pointer", borderBottom: "2px solid transparent", marginBottom: "-2px", backgroundColor: "transparent" },
  tabActivo:   { color: "var(--verde-oscuro)", borderBottomColor: "var(--verde)", fontWeight: "700" },
  grilla:      { display: "grid", gridTemplateColumns: "380px 1fr", gap: "1rem", alignItems: "start" },
  card:        { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", padding: "1.25rem", border: "1px solid var(--border)" },
  cardTitulo:  { fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.75rem" },
  toggleRow:   { display: "flex", gap: "0.5rem" },
  toggleBtn:   { flex: 1, padding: "0.6rem", borderRadius: "var(--radius-md)", fontSize: "0.875rem", fontWeight: "600", cursor: "pointer", border: "1.5px solid var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface-2)" },
  toggleActivo:{ backgroundColor: "var(--verde-claro)", border: "1.5px solid var(--verde)", color: "var(--verde-oscuro)" },
  label:       { display: "block", fontSize: "0.8rem", fontWeight: "500", color: "var(--text-secondary)", marginBottom: "0.35rem" },
  input:       { width: "100%", padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)", boxSizing: "border-box" },
  hint:        { fontSize: "0.8rem", color: "var(--text-hint)" },
  catBloque:   { border: "1px solid var(--border)", borderRadius: "var(--radius-md)", overflow: "hidden" },
  catHeader:   { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.55rem 0.75rem", backgroundColor: "var(--bg-surface-2)" },
  catToggleBtn:{ padding: "0 0.25rem", backgroundColor: "transparent", color: "var(--text-hint)", fontSize: "0.65rem", cursor: "pointer", border: "none", flexShrink: 0, lineHeight: 1 },
  catItems:    { borderTop: "1px solid var(--border)", maxHeight: "210px", overflowY: "auto" },
  itemRow:     { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.42rem 0.75rem", borderBottom: "1px solid var(--border)", cursor: "pointer" },
  tablaWrap:   { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", overflow: "hidden", border: "1px solid var(--border)" },
  thead:       { backgroundColor: "var(--bg-surface-2)" },
  th:          { padding: "0.8rem 1rem", textAlign: "left", fontSize: "0.72rem", fontWeight: "700", color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", textTransform: "uppercase", letterSpacing: "0.5px" },
  fila:        { borderBottom: "1px solid var(--border)" },
  td:          { padding: "0.75rem 1rem", fontSize: "0.875rem", color: "var(--text-primary)" },
  badge:       { display: "inline-block", padding: "0.15rem 0.55rem", borderRadius: "var(--radius-full)", fontSize: "0.72rem", fontWeight: "700" },
  filtro:      { padding: "0.45rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.8rem", border: "1px solid var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)", cursor: "pointer" },
  filtroActivo:{ backgroundColor: "var(--verde-claro)", border: "1.5px solid var(--verde)", color: "var(--verde-oscuro)", fontWeight: "600" },
  botonPrimario:   { padding: "0.6rem 1.25rem", backgroundColor: "var(--verde)", color: "white", borderRadius: "var(--radius-md)", fontWeight: "700", boxShadow: "var(--shadow-verde)", fontSize: "0.875rem", cursor: "pointer" },
  botonSecundario: { padding: "0.6rem 1.1rem", backgroundColor: "var(--bg-surface-3)", color: "var(--text-secondary)", borderRadius: "var(--radius-md)", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer", border: "1px solid var(--border)" },
  overlay:         { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" },
  modal:           { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", padding: "2rem", width: "100%", maxWidth: "460px", border: "1px solid var(--border)", textAlign: "center" },
  modalTitulo:     { fontSize: "1.15rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "0.75rem" },
  modalDesc:       { fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.6rem", lineHeight: 1.6 },
  modalResumen:    { display: "flex", flexWrap: "wrap", gap: "0.4rem", justifyContent: "center", margin: "1rem 0" },
  modalChip:       { padding: "0.25rem 0.75rem", borderRadius: "var(--radius-full)", fontSize: "0.78rem", fontWeight: "700", backgroundColor: "var(--azul-claro,#e8f0fe)", color: "var(--azul)" },
  modalBotones:    { display: "flex", gap: "0.75rem", justifyContent: "center", marginTop: "1.25rem" },
}
