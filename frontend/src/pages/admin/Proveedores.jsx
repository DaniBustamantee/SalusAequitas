import { useState, useEffect } from "react"
import Modal from "../../components/ui/Modal"
import { SkeletonTabla } from "../../components/ui/Skeleton"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { formatearCuit, validarCuitDigito } from "../../utils/cuit"
import { obtenerProvincias, obtenerLocalidades } from "../../services/georef"
import { estilosComunes } from "../../styles/estilosComunes"
import Campo from "../../components/ui/Campo"
import { useCargarDatos } from "../../hooks/useCargarDatos"

const FORM_VACIO = {
  nombre: "",
  cuit: "",
  direccion: "",
  provincia: "",
  ciudad: "",
  telefono: "",
  email: "",
  contacto_nombre: "",
}

export default function Proveedores() {
  const { datos: [proveedores], cargando, recargar: cargarProveedores } = useCargarDatos([`${API_URL}/proveedores`])
  const [busqueda, setBusqueda] = useState("")
  const [filtroActivo, setFiltroActivo] = useState("todos")
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [errores, setErrores] = useState({})
  const [provincias, setProvincias] = useState([])
  const [ciudades, setCiudades] = useState([])

  useEffect(() => {
    obtenerProvincias()
      .then(setProvincias)
      .catch(() => { })
  }, [])

  async function cargarLocalidades(provincia) {
    try {
      setCiudades(await obtenerLocalidades(provincia))
    } catch {
      setCiudades([])
    }
  }

  async function handleProvinciaChange(e) {
    const prov = e.target.value
    setForm(prev => ({ ...prev, provincia: prov, ciudad: "" }))
    if (errores.provincia) setErrores(prev => ({ ...prev, provincia: "" }))
    setCiudades([])
    if (!prov) return
    await cargarLocalidades(prov)
  }

  const filtrados = proveedores.filter((p) => {
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.email || "").toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.ciudad || "").toLowerCase().includes(busqueda.toLowerCase())
    const coincideEstado =
      filtroActivo === "todos" ||
      (filtroActivo === "activo" && p.activo) ||
      (filtroActivo === "inactivo" && !p.activo)
    return coincideBusqueda && coincideEstado
  })

  function abrirNuevo() {
    setEditando(null)
    setForm(FORM_VACIO)
    setErrores({})
    setCiudades([])
    setModalAbierto(true)
  }

  async function abrirEditar(p) {
    setEditando(p)
    setForm({
      nombre: p.nombre,
      cuit: p.cuit,
      direccion: p.direccion || "",
      provincia: p.provincia || "",
      ciudad: p.ciudad || "",
      telefono: p.telefono || "",
      email: p.email || "",
      contacto_nombre: p.contacto_nombre || "",
    })
    setErrores({})
    setCiudades([])
    if (p.provincia) await cargarLocalidades(p.provincia)
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setEditando(null)
    setForm(FORM_VACIO)
    setErrores({})
    setCiudades([])
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (errores[e.target.name]) setErrores((prev) => ({ ...prev, [e.target.name]: "" }))
  }

  function handleCuitBlur() {
    if (form.cuit) setForm(prev => ({ ...prev, cuit: formatearCuit(prev.cuit) }))
  }

  function validar() {
    const nuevosErrores = {}
    if (!form.nombre.trim()) nuevosErrores.nombre = "Campo obligatorio"

    if (!form.cuit.trim()) {
      nuevosErrores.cuit = "Campo obligatorio"
    } else {
      const digits = form.cuit.replace(/\D/g, "")
      if (digits.length !== 11) nuevosErrores.cuit = "El CUIT debe tener 11 dígitos"
      else if (!validarCuitDigito(form.cuit)) nuevosErrores.cuit = "CUIT inválido"
    }

    if (form.telefono.trim()) {
      const tel = form.telefono.replace(/\D/g, "")
      if (tel.length < 10 || tel.length > 15) nuevosErrores.telefono = "Teléfono inválido (10-15 dígitos)"
    }

    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) nuevosErrores.email = "Email inválido"

    if (!form.provincia) nuevosErrores.provincia = "Seleccioná una provincia"
    if (!form.ciudad) nuevosErrores.ciudad = "Seleccioná una ciudad"

    return nuevosErrores
  }

  async function handleGuardar() {
    const erroresValidacion = validar()
    if (Object.keys(erroresValidacion).length > 0) {
      setErrores(erroresValidacion)
      return
    }

    const url = editando ? `${API_URL}/proveedores/${editando.id_proveedor}` : `${API_URL}/proveedores`
    const method = editando ? "PUT" : "POST"

    try {
      const res = await fetchAuth(url, { method, body: JSON.stringify(form) })
      if (!res.ok) {
        const err = await res.json()
        setErrores({ nombre: err.error || "Error al guardar." })
        return
      }
      await cargarProveedores()
      cerrarModal()
    } catch {
      setErrores({ nombre: "No se pudo conectar con el servidor." })
    }
  }

  async function handleToggle(id) {
    await fetchAuth(`${API_URL}/proveedores/${id}/toggle`, { method: "PATCH" })
    await cargarProveedores()
  }

  if (cargando) return <div style={{ padding: "0" }}><SkeletonTabla filas={5} columnas={5} /></div>

  return (
    <div>
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Proveedores</h1>
          <p style={estilos.subtitulo}>Gestión de proveedores</p>
        </div>
        <button style={estilos.botonPrimario} onClick={abrirNuevo}>
          + Nuevo proveedor
        </button>
      </div>

      <div style={estilos.barra}>
        <input
          style={estilos.buscador}
          placeholder="Buscar por nombre, email o ciudad..."
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
              <th style={estilos.th}>CUIT</th>
              <th style={estilos.th}>Provincia</th>
              <th style={estilos.th}>Ciudad</th>
              <th style={estilos.th}>Contacto</th>
              <th style={estilos.th}>Email</th>
              <th style={estilos.th}>Estado</th>
              <th style={estilos.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={8} style={estilos.vacio}>
                  {busqueda || filtroActivo !== "todos"
                    ? "Sin resultados para los filtros aplicados."
                    : "No hay proveedores registrados aún."}
                </td>
              </tr>
            )}
            {filtrados.map((p) => (
              <tr key={p.id_proveedor} style={estilos.fila}>
                <td style={estilos.td}>{p.nombre}</td>
                <td style={{ ...estilos.td, fontFamily: "monospace", color: "var(--text-secondary)" }}>{p.cuit}</td>
                <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{p.provincia || "—"}</td>
                <td style={estilos.td}>{p.ciudad || "—"}</td>
                <td style={estilos.td}>{p.contacto_nombre || "—"}</td>
                <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{p.email || "—"}</td>
                <td style={estilos.td}>
                  <span style={p.activo ? estilos.badgeActivo : estilos.badgeInactivo}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td style={estilos.td}>
                  <button style={estilos.accion} onClick={() => abrirEditar(p)}>Editar</button>
                  <button
                    style={{ ...estilos.accion, color: p.activo ? "var(--rojo)" : "var(--verde)" }}
                    onClick={() => handleToggle(p.id_proveedor)}
                  >
                    {p.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <Modal
          titulo={editando ? "Editar proveedor" : "Nuevo proveedor"}
          onCerrar={cerrarModal}
        >
          <div style={estilos.formGrilla}>
            <div style={{ gridColumn: "1 / -1" }}>
              <Campo label="Nombre / Razón social" error={errores.nombre}>
                <input style={estilos.input} name="nombre" value={form.nombre} onChange={handleChange} />
              </Campo>
            </div>

            <Campo label="CUIT" error={errores.cuit}>
              <input
                style={estilos.input}
                name="cuit"
                value={form.cuit}
                onChange={handleChange}
                onBlur={handleCuitBlur}
                placeholder="XX-XXXXXXXX-X"
                maxLength={13}
              />
            </Campo>

            <Campo label="Teléfono" error={errores.telefono}>
              <input style={estilos.input} name="telefono" value={form.telefono} onChange={handleChange} placeholder="Ej: 3516123456" />
            </Campo>

            <Campo label="Email" error={errores.email}>
              <input style={estilos.input} name="email" value={form.email} onChange={handleChange} />
            </Campo>

            <Campo label="Nombre de contacto">
              <input style={estilos.input} name="contacto_nombre" value={form.contacto_nombre} onChange={handleChange} />
            </Campo>

            <Campo label="Provincia" error={errores.provincia}>
              <select style={estilos.input} value={form.provincia} onChange={handleProvinciaChange}>
                <option value="">Seleccionar provincia...</option>
                {provincias.map(p => (
                  <option key={p.id} value={p.nombre}>{p.nombre}</option>
                ))}
              </select>
            </Campo>

            <Campo label="Ciudad" error={errores.ciudad}>
              <select
                style={estilos.input}
                name="ciudad"
                value={form.ciudad}
                onChange={handleChange}
                disabled={!form.provincia || ciudades.length === 0}
              >
                <option value="">Seleccionar ciudad...</option>
                {ciudades.map(c => (
                  <option key={c.id} value={c.nombre}>{c.nombre}</option>
                ))}
              </select>
            </Campo>

            <div style={{ gridColumn: "1 / -1" }}>
              <Campo label="Dirección">
                <input style={estilos.input} name="direccion" value={form.direccion} onChange={handleChange} placeholder="Calle y número" />
              </Campo>
            </div>
          </div>

          <div style={estilos.formAcciones}>
            <button style={estilos.botonSecundario} onClick={cerrarModal}>Cancelar</button>
            <button style={estilos.botonPrimario} onClick={handleGuardar}>
              {editando ? "Guardar cambios" : "Crear proveedor"}
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
  formGrilla: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" },
  input: { width: "100%", padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)", boxSizing: "border-box" },
}
