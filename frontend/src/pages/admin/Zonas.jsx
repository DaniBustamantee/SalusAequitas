import { Fragment, useState, useEffect } from "react"
import Modal from "../../components/ui/Modal"
import { SkeletonTabla } from "../../components/ui/Skeleton"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { obtenerProvincias, obtenerLocalidades } from "../../services/georef"
import { estilosComunes } from "../../styles/estilosComunes"
import Campo from "../../components/ui/Campo"
import { useCargarDatos } from "../../hooks/useCargarDatos"

const FORM_VACIO = { nombre: "", provincia: "", descripcion: "" }

export default function Zonas() {
  const { datos: [zonas], cargando, recargar: cargarZonas } = useCargarDatos([`${API_URL}/zonas`])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [zonaEditando, setZonaEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [errores, setErrores] = useState({})
  const [provincias, setProvincias] = useState([])
  const [localidades, setLocalidades] = useState([])
  const [busqueda, setBusqueda] = useState("")

  useEffect(() => {
    obtenerProvincias()
      .then(setProvincias)
      .catch(() => { })
  }, [])

  async function cargarLocalidades(provincia) {
    try {
      setLocalidades(await obtenerLocalidades(provincia))
    } catch {
      setLocalidades([])
    }
  }

  async function handleProvinciaChange(e) {
    const provincia = e.target.value
    setForm(prev => ({ ...prev, provincia, nombre: "" }))
    if (errores.provincia) setErrores(prev => ({ ...prev, provincia: "" }))
    setLocalidades([])
    if (!provincia) return
    await cargarLocalidades(provincia)
  }

  function handleLocalidadChange(e) {
    setForm(prev => ({ ...prev, nombre: e.target.value }))
    if (errores.nombre) setErrores(prev => ({ ...prev, nombre: "" }))
  }

  function abrirNuevo() {
    setZonaEditando(null)
    setForm(FORM_VACIO)
    setErrores({})
    setLocalidades([])
    setModalAbierto(true)
  }

  async function abrirEditar(zona) {
    setZonaEditando(zona)
    setForm({ nombre: zona.nombre, provincia: zona.provincia || "", descripcion: zona.descripcion || "" })
    setErrores({})
    setLocalidades([])
    if (zona.provincia) await cargarLocalidades(zona.provincia)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setZonaEditando(null)
    setForm(FORM_VACIO)
    setErrores({})
    setLocalidades([])
  }

  function validar() {
    const nuevosErrores = {}
    if (!form.provincia) nuevosErrores.provincia = "Seleccioná una provincia"
    if (!form.nombre.trim()) nuevosErrores.nombre = "Seleccioná una localidad"
    return nuevosErrores
  }

  async function handleGuardar() {
    const erroresValidacion = validar()
    if (Object.keys(erroresValidacion).length > 0) {
      setErrores(erroresValidacion)
      return
    }

    const url = zonaEditando ? `${API_URL}/zonas/${zonaEditando.id_zona}` : `${API_URL}/zonas`
    const method = zonaEditando ? "PUT" : "POST"

    try {
      const res = await fetchAuth(url, { method, body: JSON.stringify(form) })
      if (!res.ok) {
        const err = await res.json()
        setErrores({ nombre: err.error || "Error al guardar." })
        return
      }
      await cargarZonas()
      cerrarModal()
    } catch {
      setErrores({ nombre: "No se pudo conectar con el servidor." })
    }
  }

  async function handleToggle(idZona) {
    await fetchAuth(`${API_URL}/zonas/${idZona}/toggle`, { method: "PATCH" })
    await cargarZonas()
  }

  const zonasPorProvincia = zonas.reduce((grupos, zona) => {
    const provincia = zona.provincia || "Sin provincia"
    if (!grupos[provincia]) grupos[provincia] = []
    grupos[provincia].push(zona)
    return grupos
  }, {})

  const texto = busqueda.toLowerCase()
  const zonasFiltradas = busqueda
    ? zonas.filter(z =>
      z.nombre.toLowerCase().includes(texto) ||
      (z.provincia || "").toLowerCase().includes(texto)
    )
    : null

  if (cargando) return <div style={{ padding: "0" }}><SkeletonTabla filas={4} columnas={4} /></div>

  return (
    <div>
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Zonas</h1>
          <p style={estilos.subtitulo}>Zonas de distribución — {zonas.length} registrada{zonas.length !== 1 ? "s" : ""}</p>
        </div>
        <button style={estilos.botonPrimario} onClick={abrirNuevo}>+ Nueva zona</button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <input
          style={estilos.buscador}
          placeholder="Buscar por localidad o provincia..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      <div style={estilos.tabla}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={estilos.thead}>
              <th style={estilos.th}>Provincia</th>
              <th style={estilos.th}>Localidad</th>
              <th style={estilos.th}>Descripción</th>
              <th style={estilos.th}>Estado</th>
              <th style={estilos.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {zonas.length === 0 && (
              <tr>
                <td colSpan={5} style={estilos.vacio}>
                  No hay zonas registradas. Creá una seleccionando provincia y localidad.
                </td>
              </tr>
            )}

            {zonasFiltradas && zonasFiltradas.map(zona => (
              <FilaZona
                key={zona.id_zona}
                zona={zona}
                mostrarProvincia
                onEditar={abrirEditar}
                onToggle={handleToggle}
              />
            ))}

            {!zonasFiltradas && Object.entries(zonasPorProvincia).map(([provincia, lista]) => (
              <Fragment key={`header-${provincia}`}>
                <tr style={estilos.filaProv}>
                  <td colSpan={5} style={estilos.tdProv}>{provincia} <span style={{ fontWeight: "400", color: "var(--text-hint)" }}>({lista.length})</span></td>
                </tr>
                {lista.map(zona => (
                  <FilaZona key={zona.id_zona} zona={zona} onEditar={abrirEditar} onToggle={handleToggle} />
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <Modal titulo={zonaEditando ? "Editar zona" : "Nueva zona"} onCerrar={cerrarModal}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>

            <Campo label="Provincia" error={errores.provincia}>
              <select style={estilos.input} value={form.provincia} onChange={handleProvinciaChange}>
                <option value="">Seleccionar provincia...</option>
                {provincias.map(p => (
                  <option key={p.id} value={p.nombre}>{p.nombre}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Localidad" error={errores.nombre}>
              <select
                style={estilos.input}
                name="nombre"
                value={form.nombre}
                onChange={handleLocalidadChange}
                disabled={!form.provincia || localidades.length === 0}
              >
                <option value="">Seleccionar localidad...</option>
                {localidades.map(l => (
                  <option key={l.id} value={l.nombre}>{l.nombre}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Descripción (opcional)">
              <input
                style={estilos.input}
                name="descripcion"
                value={form.descripcion}
                onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                placeholder="Ej: Zona norte del Gran Córdoba"
              />
            </Campo>
          </div>

          <div style={estilos.formAcciones}>
            <button style={estilos.botonSecundario} onClick={cerrarModal}>Cancelar</button>
            <button style={estilos.botonPrimario} onClick={handleGuardar}>
              {zonaEditando ? "Guardar cambios" : "Crear zona"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FilaZona({ zona, mostrarProvincia = false, onEditar, onToggle }) {
  return (
    <tr style={estilos.fila}>
      {mostrarProvincia
        ? <td style={{ ...estilos.td, color: "var(--text-secondary)", fontSize: "0.8rem" }}>{zona.provincia || "—"}</td>
        : <td style={estilos.td}></td>}
      <td style={{ ...estilos.td, fontWeight: "600" }}>{zona.nombre}</td>
      <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{zona.descripcion || "—"}</td>
      <td style={estilos.td}>
        <span style={zona.activa ? estilos.badgeActivo : estilos.badgeInactivo}>
          {zona.activa ? "Activa" : "Inactiva"}
        </span>
      </td>
      <td style={estilos.td}>
        <button style={estilos.accion} onClick={() => onEditar(zona)}>Editar</button>
        <button style={{ ...estilos.accion, color: zona.activa ? "var(--rojo)" : "var(--verde)" }} onClick={() => onToggle(zona.id_zona)}>
          {zona.activa ? "Desactivar" : "Activar"}
        </button>
      </td>
    </tr>
  )
}

const estilos = {
  ...estilosComunes,
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  buscador: { width: "100%", padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", backgroundColor: "var(--bg-surface)", boxShadow: "var(--shadow-xs)", boxSizing: "border-box" },
  filaProv: { backgroundColor: "var(--bg-surface-2)" },
  tdProv: { padding: "0.5rem 1.1rem", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" },
  vacio: { padding: "2.5rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem" },
  input: { width: "100%", padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)", boxSizing: "border-box" },
}
