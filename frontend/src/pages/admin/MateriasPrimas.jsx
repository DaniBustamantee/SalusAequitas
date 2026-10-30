import { useState } from "react"
import Modal from "../../components/ui/Modal"
import { SkeletonTabla } from "../../components/ui/Skeleton"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { estilosComunes } from "../../styles/estilosComunes"
import Campo from "../../components/ui/Campo"
import { useCargarDatos } from "../../hooks/useCargarDatos"

const FORM_VACIO = {
  nombre: "",
  descripcion: "",
  unidad_medida: "",
  stock_actual: "",
  stock_minimo: "",
  costo_unitario: "",
  id_proveedor: "",
}

function estadoStock(mp) {
  if (mp.stock_actual <= mp.stock_minimo)
    return { texto: "Bajo", estilo: "bajo" }
  return { texto: "Normal", estilo: "normal" }
}

export default function MateriasPrimas() {
  const { datos: [materias, proveedores], cargando, recargar: cargarMateriasPrimas } = useCargarDatos([
    `${API_URL}/insumos?tipo=materia_prima`,
    `${API_URL}/proveedores`,
  ])
  const [busqueda, setBusqueda] = useState("")
  const [filtroActivo, setFiltroActivo] = useState("todos")
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [errores, setErrores] = useState({})

  const filtrados = materias.filter((m) => {
    const coincideBusqueda =
      m.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      m.unidad_medida.toLowerCase().includes(busqueda.toLowerCase())
    const coincideEstado =
      filtroActivo === "todos" ||
      (filtroActivo === "activo" && m.activo) ||
      (filtroActivo === "inactivo" && !m.activo)
    return coincideBusqueda && coincideEstado
  })

  function abrirNuevo() {
    setEditando(null); setForm(FORM_VACIO); setErrores({}); setModalAbierto(true)
  }

  function abrirEditar(m) {
    setEditando(m)
    setForm({
      nombre: m.nombre,
      descripcion: m.descripcion,
      unidad_medida: m.unidad_medida,
      stock_actual: m.stock_actual,
      stock_minimo: m.stock_minimo,
      costo_unitario: m.costo_unitario,
      id_proveedor: m.id_proveedor,
    })
    setErrores({}); setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false); setEditando(null); setForm(FORM_VACIO); setErrores({})
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (errores[e.target.name]) setErrores((prev) => ({ ...prev, [e.target.name]: "" }))
  }

  function validar() {
    const nuevosErrores = {}
    if (!form.nombre.trim()) nuevosErrores.nombre = "Campo obligatorio"
    if (!form.unidad_medida.trim()) nuevosErrores.unidad_medida = "Campo obligatorio"
    if (form.stock_actual === "" || isNaN(form.stock_actual)) nuevosErrores.stock_actual = "Debe ser un número"
    if (form.stock_minimo === "" || isNaN(form.stock_minimo)) nuevosErrores.stock_minimo = "Debe ser un número"
    if (form.costo_unitario === "" || isNaN(form.costo_unitario)) nuevosErrores.costo_unitario = "Debe ser un número"
    return nuevosErrores
  }

  async function handleGuardar() {
    const erroresValidacion = validar()
    if (Object.keys(erroresValidacion).length > 0) {
      setErrores(erroresValidacion)
      return
    }

    const url = editando ? `${API_URL}/insumos/${editando.id_insumo}` : `${API_URL}/insumos`
    const method = editando ? "PUT" : "POST"

    try {
      await fetchAuth(url, {
        method,
        body: JSON.stringify({ ...form, tipo: "materia_prima" }),
      })
      await cargarMateriasPrimas()
      cerrarModal()
    } catch {
      setErrores({ nombre: "No se pudo guardar. Intentá de nuevo." })
    }
  }

  async function handleToggle(id) {
    await fetchAuth(`${API_URL}/insumos/${id}/toggle`, { method: "PATCH" })
    await cargarMateriasPrimas()
  }

  if (cargando) return <div style={{ padding: "0" }}><SkeletonTabla filas={5} columnas={6} /></div>

  return (
    <div>
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Materias Primas</h1>
          <p style={estilos.subtitulo}>Insumos que se incorporan al producto final</p>
        </div>
        <button style={estilos.botonPrimario} onClick={abrirNuevo}>
          + Nueva materia prima
        </button>
      </div>

      <div style={estilos.barra}>
        <input
          style={estilos.buscador}
          placeholder="Buscar por nombre o unidad..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div style={estilos.filtros}>
          {["todos", "activo", "inactivo"].map((f) => (
            <button
              key={f}
              style={filtroActivo === f ? { ...estilos.filtro, ...estilos.filtroActivo } : estilos.filtro}
              onClick={() => setFiltroActivo(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={estilos.tabla}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={estilos.thead}>
              <th style={estilos.th}>Nombre</th>
              <th style={estilos.th}>Proveedor</th>
              <th style={estilos.th}>Unidad</th>
              <th style={estilos.th}>Costo unitario</th>
              <th style={estilos.th}>Stock actual</th>
              <th style={estilos.th}>Punto de reorden</th>
              <th style={estilos.th}>Estado stock</th>
              <th style={estilos.th}>Estado</th>
              <th style={estilos.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={9} style={estilos.vacio}>
                  {busqueda || filtroActivo !== "todos"
                    ? "Sin resultados para los filtros aplicados."
                    : "No hay materias primas registradas aún."}
                </td>
              </tr>
            )}
            {filtrados.map((m) => {
              const stock = estadoStock(m)
              return (
                <tr key={m.id_insumo} style={estilos.fila}>
                  <td style={estilos.td}>{m.nombre}</td>
                  <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>
                    {m.proveedor || "—"}
                  </td>
                  <td style={estilos.td}>{m.unidad_medida}</td>
                  <td style={{ ...estilos.td, fontWeight: "600", color: "var(--verde-oscuro)" }}>
                    ${Number(m.costo_unitario).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={estilos.td}>{m.stock_actual}</td>
                  <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{m.stock_minimo}</td>
                  <td style={estilos.td}>
                    <span style={estilos.badges[stock.estilo]}>{stock.texto}</span>
                  </td>
                  <td style={estilos.td}>
                    <span style={m.activo ? estilos.badgeActivo : estilos.badgeInactivo}>
                      {m.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    <button style={estilos.accion} onClick={() => abrirEditar(m)}>Editar</button>
                    <button
                      style={{ ...estilos.accion, color: m.activo ? "var(--rojo)" : "var(--verde)" }}
                      onClick={() => handleToggle(m.id_insumo)}
                    >
                      {m.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <Modal
          titulo={editando ? "Editar materia prima" : "Nueva materia prima"}
          onCerrar={cerrarModal}
        >
          <div style={estilos.formGrilla}>
            <Campo label="Nombre" error={errores.nombre}>
              <input style={estilos.input} name="nombre" value={form.nombre} onChange={handleChange} />
            </Campo>
            <Campo label="Unidad de medida" error={errores.unidad_medida}>
              <input style={estilos.input} name="unidad_medida" value={form.unidad_medida} onChange={handleChange} />
            </Campo>
            <Campo label="Costo unitario ($)" error={errores.costo_unitario}>
              <input style={estilos.input} name="costo_unitario" value={form.costo_unitario} onChange={handleChange} type="number" min="0" step="0.01" />
            </Campo>
            <Campo label="Stock actual" error={errores.stock_actual}>
              <input style={estilos.input} name="stock_actual" value={form.stock_actual} onChange={handleChange} type="number" min="0" />
            </Campo>
            <Campo label="Punto de reorden" error={errores.stock_minimo}>
              <input style={estilos.input} name="stock_minimo" value={form.stock_minimo} onChange={handleChange} type="number" min="0" />
            </Campo>
            <Campo label="Proveedor">
              <select style={estilos.input} name="id_proveedor" value={form.id_proveedor} onChange={handleChange}>
                <option value="">Sin proveedor</option>
                {proveedores.filter((p) => p.activo).map((p) => (
                  <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre}</option>
                ))}
              </select>
            </Campo>
            <div style={{ gridColumn: "1 / -1" }}>
              <Campo label="Descripción">
                <input style={estilos.input} name="descripcion" value={form.descripcion} onChange={handleChange} />
              </Campo>
            </div>
          </div>

          <div style={estilos.formAcciones}>
            <button style={estilos.botonSecundario} onClick={cerrarModal}>Cancelar</button>
            <button style={estilos.botonPrimario} onClick={handleGuardar}>
              {editando ? "Guardar cambios" : "Crear materia prima"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

const estilos = {
  ...estilosComunes,
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  barra: { display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center" },
  buscador: { flex: 1, padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", backgroundColor: "var(--bg-surface)", boxShadow: "var(--shadow-xs)" },
  vacio: { padding: "2.5rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem" },
  badges: {
    normal: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600", backgroundColor: "var(--verde-claro)", color: "var(--verde-oscuro)" },
    bajo: { display: "inline-block", padding: "0.2rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600", backgroundColor: "var(--naranja-claro)", color: "var(--naranja)" },
  },
  formGrilla: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" },
  input: { width: "100%", padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)" },
}
