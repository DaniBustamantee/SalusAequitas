import { useState } from "react"
import Modal from "../../components/ui/Modal"
import { SkeletonTabla } from "../../components/ui/Skeleton"
import { useToast } from "../../context/ToastContext"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { estilosComunes } from "../../styles/estilosComunes"
import Campo from "../../components/ui/Campo"
import { useCargarDatos } from "../../hooks/useCargarDatos"

const FORM_VACIO = {
  nombre: "",
  apellido: "",
  email: "",
  dni: "",
  nro_licencia: "",
  tipo_vehiculo: "",
  patente: "",
  zonas: [],
}

export default function Transportistas() {
  const { showToast } = useToast()
  const { datos: [transportistas, zonas], cargando, recargar: cargarTransportistas } = useCargarDatos([
    `${API_URL}/transportistas`,
    `${API_URL}/zonas`,
  ], () => showToast("No se pudo conectar con el servidor.", "error"))
  const [busqueda, setBusqueda] = useState("")
  const [filtroActivo, setFiltroActivo] = useState("todos")
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [errores, setErrores] = useState({})
  const [busquedaZona, setBusquedaZona] = useState("")
  const [accesoGenerado, setAccesoGenerado] = useState(null)

  const filtrados = transportistas.filter((t) => {
    const nombre = `${t.nombre} ${t.apellido}`.toLowerCase()
    const coincideBusqueda =
      nombre.includes(busqueda.toLowerCase()) ||
      t.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.patente.toLowerCase().includes(busqueda.toLowerCase())

    const coincideEstado =
      filtroActivo === "todos" ||
      (filtroActivo === "activo" && t.activo) ||
      (filtroActivo === "inactivo" && !t.activo)

    return coincideBusqueda && coincideEstado
  })

  function abrirNuevo() {
    setEditando(null)
    setForm(FORM_VACIO)
    setErrores({})
    setBusquedaZona("")
    setModalAbierto(true)
  }

  function abrirEditar(t) {
    setEditando(t)
    setForm({
      nombre: t.nombre,
      apellido: t.apellido,
      email: t.email,
      dni: t.dni,
      nro_licencia: t.nro_licencia,
      tipo_vehiculo: t.tipo_vehiculo,
      patente: t.patente,
      zonas: t.zonas || [],
    })
    setErrores({})
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setEditando(null)
    setForm(FORM_VACIO)
    setErrores({})
    setBusquedaZona("")
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (errores[e.target.name]) {
      setErrores((prev) => ({ ...prev, [e.target.name]: "" }))
    }
  }

  function handleZona(id) {
    setForm((prev) => {
      const yaEsta = prev.zonas.includes(id)
      return {
        ...prev,
        zonas: yaEsta ? prev.zonas.filter((z) => z !== id) : [...prev.zonas, id],
      }
    })
  }

  function validar() {
    const nuevosErrores = {}
    if (!form.nombre.trim()) nuevosErrores.nombre = "Campo obligatorio"
    if (!form.apellido.trim()) nuevosErrores.apellido = "Campo obligatorio"
    if (!form.email.trim()) nuevosErrores.email = "Campo obligatorio"
    else if (!/\S+@\S+\.\S+/.test(form.email)) nuevosErrores.email = "Email inválido"
    if (!form.dni.trim()) nuevosErrores.dni = "Campo obligatorio"
    if (!form.nro_licencia.trim()) nuevosErrores.nro_licencia = "Campo obligatorio"
    if (!form.patente.trim()) nuevosErrores.patente = "Campo obligatorio"
    return nuevosErrores
  }

  async function handleGuardar() {
    const erroresValidacion = validar()
    if (Object.keys(erroresValidacion).length > 0) {
      setErrores(erroresValidacion)
      return
    }

    const url = editando ? `${API_URL}/transportistas/${editando.id_transportista}` : `${API_URL}/transportistas`
    const method = editando ? "PUT" : "POST"

    try {
      const res = await fetchAuth(url, { method, body: JSON.stringify(form) })
      if (!res.ok) {
        const err = await res.json()
        showToast(err.error || "Error al guardar.", "error")
        return
      }
      await cargarTransportistas()
      cerrarModal()
      showToast(editando ? "Transportista actualizado correctamente." : "Transportista creado correctamente.", "exito")
    } catch {
      showToast("No se pudo conectar con el servidor.", "error")
    }
  }

  async function handleToggle(t) {
    try {
      const res = await fetchAuth(`${API_URL}/transportistas/${t.id_transportista}/toggle`, { method: "PATCH" })
      if (!res.ok) {
        const err = await res.json()
        showToast(err.error || "No se pudo cambiar el estado.", "error")
        return
      }
      await cargarTransportistas()
      showToast(`Transportista ${t.activo ? "desactivado" : "activado"} correctamente.`, "exito")
    } catch {
      showToast("No se pudo cambiar el estado.", "error")
    }
  }

  async function handleResetPassword(t) {
    if (!window.confirm(`¿Generar una contraseña temporal para ${t.nombre} ${t.apellido}? La actual deja de funcionar.`)) return
    try {
      const res = await fetchAuth(`${API_URL}/transportistas/${t.id_transportista}/reset-password`, { method: "PATCH" })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || "Error al resetear la contraseña.", "error")
        return
      }
      setAccesoGenerado({ nombre: `${t.nombre} ${t.apellido}`, email: t.email, password: data.password_temporal })
    } catch {
      showToast("No se pudo conectar con el servidor.", "error")
    }
  }

  if (cargando) return (
    <div>
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Transportistas</h1>
          <p style={estilos.subtitulo}>Gestión de transportistas</p>
        </div>
      </div>
      <SkeletonTabla filas={5} columnas={7} />
    </div>
  )

  return (
    <div>
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Transportistas</h1>
          <p style={estilos.subtitulo}>Gestión de transportistas</p>
        </div>
        <button style={estilos.botonPrimario} onClick={abrirNuevo}>
          + Nuevo transportista
        </button>
      </div>

      <div style={estilos.barra}>
        <input
          style={estilos.buscador}
          placeholder="Buscar por nombre, email o patente..."
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
              <th style={estilos.th}>Email</th>
              <th style={estilos.th}>Patente</th>
              <th style={estilos.th}>Vehículo</th>
              <th style={estilos.th}>Zonas</th>
              <th style={estilos.th}>Estado</th>
              <th style={estilos.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={7} style={estilos.vacio}>
                  {busqueda || filtroActivo !== "todos"
                    ? "Sin resultados para los filtros aplicados."
                    : "No hay transportistas registrados aún."}
                </td>
              </tr>
            )}
            {filtrados.map((t) => (
              <tr key={t.id_transportista} style={estilos.fila}>
                <td style={estilos.td}>{t.nombre} {t.apellido}</td>
                <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{t.email}</td>
                <td style={estilos.td}>{t.patente}</td>
                <td style={estilos.td}>{t.tipo_vehiculo}</td>
                <td style={estilos.td}>
                  {t.zonas.length === 0
                    ? <span style={{ color: "var(--text-hint)" }}>Sin zonas</span>
                    : t.zonas.map((zid) => (
                      <span key={zid} style={estilos.badgeZona}>
                        {zonas.find((z) => z.id_zona === zid)?.nombre}
                      </span>
                    ))
                  }
                </td>
                <td style={estilos.td}>
                  <span style={t.activo ? estilos.badgeActivo : estilos.badgeInactivo}>
                    {t.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td style={estilos.td}>
                  <button style={estilos.accion} onClick={() => abrirEditar(t)}>Editar</button>
                  <button style={estilos.accion} onClick={() => handleResetPassword(t)}>Resetear contraseña</button>
                  <button
                    style={{ ...estilos.accion, color: t.activo ? "var(--rojo)" : "var(--verde)" }}
                    onClick={() => handleToggle(t)}
                  >
                    {t.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {accesoGenerado && (
        <Modal titulo="Contraseña temporal generada" onCerrar={() => setAccesoGenerado(null)}>
          <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
            Pasale estos datos a <strong>{accesoGenerado.nombre}</strong> para que pueda iniciar sesión:
          </p>
          <p style={{ fontSize: "0.875rem", marginBottom: "0.4rem" }}>Email: <strong>{accesoGenerado.email}</strong></p>
          <p style={{ fontSize: "0.875rem", marginBottom: "1.5rem" }}>Contraseña: <strong>{accesoGenerado.password}</strong></p>
          <div style={estilos.formAcciones}>
            <button style={estilos.botonPrimario} onClick={() => setAccesoGenerado(null)}>Listo</button>
          </div>
        </Modal>
      )}

      {modalAbierto && (
        <Modal
          titulo={editando ? "Editar transportista" : "Nuevo transportista"}
          onCerrar={cerrarModal}
        >
          <div style={estilos.formGrilla}>
            <Campo label="Nombre" error={errores.nombre}>
              <input style={estilos.input} name="nombre" value={form.nombre} onChange={handleChange} />
            </Campo>
            <Campo label="Apellido" error={errores.apellido}>
              <input style={estilos.input} name="apellido" value={form.apellido} onChange={handleChange} />
            </Campo>
            <Campo label="Email" error={errores.email}>
              <input style={estilos.input} name="email" value={form.email} onChange={handleChange} />
            </Campo>
            <Campo label="DNI" error={errores.dni}>
              <input style={estilos.input} name="dni" value={form.dni} onChange={handleChange} />
            </Campo>
            <Campo label="Nro. licencia" error={errores.nro_licencia}>
              <input style={estilos.input} name="nro_licencia" value={form.nro_licencia} onChange={handleChange} />
            </Campo>
            <Campo label="Patente" error={errores.patente}>
              <input style={estilos.input} name="patente" value={form.patente} onChange={handleChange} />
            </Campo>
            <Campo label="Tipo de vehículo">
              <select style={estilos.input} name="tipo_vehiculo" value={form.tipo_vehiculo} onChange={handleChange}>
                <option value="">Seleccionar...</option>
                <option value="Furgón">Furgón</option>
                <option value="Camioneta">Camioneta</option>
                <option value="Camión">Camión</option>
              </select>
            </Campo>
          </div>

          <Campo label="Zonas asignadas">

            {form.zonas.length > 0 && (
              <div style={estilos.tagsContainer}>
                {form.zonas.map((id) => {
                  const zona = zonas.find(z => z.id_zona === id)
                  if (!zona) return null
                  return (
                    <span key={id} style={estilos.tag}>
                      {zona.nombre}
                      <button style={estilos.tagX} onClick={() => handleZona(id)}>×</button>
                    </span>
                  )
                })}
              </div>
            )}

            <input
              style={{ ...estilos.input, marginTop: form.zonas.length > 0 ? "0.5rem" : "0" }}
              placeholder="Buscar provincia..."
              value={busquedaZona}
              onChange={(e) => setBusquedaZona(e.target.value)}
            />

            {busquedaZona.trim() && (
              <div style={estilos.zonaDropdown}>
                {zonas
                  .filter(z =>
                    z.activa &&
                    z.nombre.toLowerCase().includes(busquedaZona.toLowerCase()) &&
                    !form.zonas.includes(z.id_zona)
                  )
                  .map(z => (
                    <div
                      key={z.id_zona}
                      style={estilos.zonaOpcion}
                      onClick={() => { handleZona(z.id_zona); setBusquedaZona("") }}
                    >
                      {z.nombre}
                    </div>
                  ))
                }
                {zonas.filter(z =>
                  z.activa &&
                  z.nombre.toLowerCase().includes(busquedaZona.toLowerCase()) &&
                  !form.zonas.includes(z.id_zona)
                ).length === 0 && (
                    <div style={{ padding: "0.6rem 1rem", fontSize: "0.8rem", color: "var(--text-hint)" }}>
                      Sin resultados
                    </div>
                  )}
              </div>
            )}
          </Campo>

          <div style={{ ...estilos.formAcciones, marginTop: "1.5rem" }}>
            <button style={estilos.botonSecundario} onClick={cerrarModal}>Cancelar</button>
            <button style={estilos.botonPrimario} onClick={handleGuardar}>
              {editando ? "Guardar cambios" : "Crear transportista"}
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
  alertaBanner: { display: "flex", alignItems: "center", gap: "0.75rem", backgroundColor: "var(--rojo-claro)", border: "1px solid var(--rojo)", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.875rem", color: "var(--rojo)" },
  barra: { display: "flex", gap: "1rem", marginBottom: "1rem", alignItems: "center" },
  buscador: { flex: 1, padding: "0.6rem 0.75rem", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem" },
  vacio: { padding: "2.5rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem" },
  badgeZona: { display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "var(--radius-sm)", fontSize: "0.72rem", backgroundColor: "var(--azul-claro)", color: "var(--azul)", marginRight: "0.3rem", marginBottom: "0.2rem" },
  formGrilla: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" },
  input: { width: "100%", padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)" },
  tagsContainer: { display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.35rem" },
  tag: { display: "inline-flex", alignItems: "center", gap: "0.3rem", backgroundColor: "var(--verde-claro)", color: "var(--verde-oscuro)", border: "1px solid var(--verde)", borderRadius: "var(--radius-full)", padding: "0.2rem 0.6rem", fontSize: "0.78rem", fontWeight: "600" },
  tagX: { background: "none", border: "none", cursor: "pointer", color: "var(--verde-oscuro)", fontWeight: "700", fontSize: "1rem", lineHeight: 1, padding: "0 0.1rem" },
  zonaDropdown: { border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-surface)", boxShadow: "var(--shadow-md)", maxHeight: "180px", overflowY: "auto", marginTop: "0.25rem" },
  zonaOpcion: { padding: "0.6rem 1rem", fontSize: "0.875rem", cursor: "pointer", color: "var(--text-primary)", borderBottom: "1px solid var(--border)" },
}