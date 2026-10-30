import { useState, useEffect } from "react"
import Modal from "../../components/ui/Modal"
import { SkeletonTabla } from "../../components/ui/Skeleton"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { useToast } from "../../context/ToastContext"
import { formatearCuit, validarCuitDigito } from "../../utils/cuit"
import { estilosComunes } from "../../styles/estilosComunes"
import { useCargarDatos } from "../../hooks/useCargarDatos"

const VACIO_NUEVO = {
  razon_social: "", cuil_cuit: "", email: "",
  telefono: "", direccion: "", ciudad: "", provincia: "", id_zona: "",
}

function getBadgeEstado(estado) {
  const base = {
    display: "inline-block", padding: "0.2rem 0.65rem",
    borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600",
  }
  if (estado === "Entregado") return { ...base, backgroundColor: "var(--verde-claro)", color: "var(--verde-oscuro)" }
  if (estado === "Cancelado") return { ...base, backgroundColor: "var(--rojo-claro)", color: "var(--rojo)" }
  if (estado === "Despachado") return { ...base, backgroundColor: "var(--azul-claro)", color: "var(--azul)" }
  if (estado === "Confirmado") return { ...base, backgroundColor: "var(--azul-claro)", color: "var(--azul)" }
  return { ...base, backgroundColor: "var(--bg-surface-3)", color: "var(--text-secondary)", border: "1px solid var(--border)" }
}

export default function Clientes() {

  const { showToast } = useToast()
  const { datos: [clientes, zonas], cargando, recargar: cargarClientes } = useCargarDatos([
    `${API_URL}/clientes`,
    `${API_URL}/zonas`,
  ], () => showToast("No se pudo conectar con el servidor.", "error"))
  const [busqueda, setBusqueda] = useState("")
  const [filtroActivo, setFiltroActivo] = useState("todos")

  const [modalAbierto, setModalAbierto] = useState(false)
  const [form, setForm] = useState(VACIO_NUEVO)
  const [errores, setErrores] = useState({})
  const [provincias, setProvincias] = useState([])
  const [ciudades, setCiudades] = useState([])
  const [guardando, setGuardando] = useState(false)

  const [modalDetalle, setModalDetalle] = useState(false)
  const [clienteDetalle, setClienteDetalle] = useState(null)
  const [pestana, setPestana] = useState("datos")
  const [pedidosCliente, setPedidosCliente] = useState([])
  const [cargandoPedidos, setCargandoPedidos] = useState(false)
  const [formDatos, setFormDatos] = useState({})
  const [formNotas, setFormNotas] = useState("")
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  const [guardandoNotas, setGuardandoNotas] = useState(false)
  const [aprobando, setAprobando] = useState(false)
  const [passTemp, setPassTemp] = useState("")

  useEffect(() => {
    fetch('https://apis.datos.gob.ar/georef/api/provincias?orden=nombre&campos=nombre')
      .then(r => r.json())
      .then(d => setProvincias(d.provincias || []))
      .catch(() => { })
  }, [])

  const pendientes = clientes.filter((c) => !c.fecha_aprobacion)

  const clientesFiltrados = clientes.filter((c) => {
    const coincideBusqueda =
      c.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.email.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.ciudad.toLowerCase().includes(busqueda.toLowerCase())

    const coincideEstado =
      filtroActivo === "todos" ||
      (filtroActivo === "activo" && c.activo && c.fecha_aprobacion) ||
      (filtroActivo === "inactivo" && !c.activo && c.fecha_aprobacion) ||
      (filtroActivo === "pendiente" && !c.fecha_aprobacion)

    return coincideBusqueda && coincideEstado
  })

  function abrirNuevo() {
    setForm(VACIO_NUEVO)
    setErrores({})
    setModalAbierto(true)
  }

  function cerrarModal() {
    setModalAbierto(false)
    setForm(VACIO_NUEVO)
    setErrores({})
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (errores[e.target.name]) setErrores((prev) => ({ ...prev, [e.target.name]: "" }))
  }

  async function handleProvinciaChange(nombreProvincia) {
    setForm(prev => ({ ...prev, provincia: nombreProvincia, ciudad: "" }))
    setCiudades([])
    if (!nombreProvincia) return
    try {
      const r = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(nombreProvincia)}&max=500&orden=nombre&campos=nombre`)
      const d = await r.json()
      setCiudades(d.localidades || [])
    } catch {
      setCiudades([])
    }
  }

  function validarNuevo() {
    const nuevosErrores = {}
    if (!form.razon_social.trim()) nuevosErrores.razon_social = "Campo obligatorio"
    if (!form.cuil_cuit.trim()) {
      nuevosErrores.cuil_cuit = "Campo obligatorio"
    } else if (!/^\d{2}-\d{8}-\d{1}$/.test(form.cuil_cuit)) {
      nuevosErrores.cuil_cuit = "Formato inválido (XX-XXXXXXXX-X)"
    } else if (!validarCuitDigito(form.cuil_cuit)) {
      nuevosErrores.cuil_cuit = "CUIL/CUIT inválido"
    }
    if (!form.email.trim()) nuevosErrores.email = "Campo obligatorio"
    else if (!/\S+@\S+\.\S+/.test(form.email)) nuevosErrores.email = "Email inválido"
    if (form.telefono && !/^[\d\s+\-()]{8,15}$/.test(form.telefono)) {
      nuevosErrores.telefono = "Teléfono inválido (8 a 15 dígitos)"
    }
    if (!form.provincia) nuevosErrores.provincia = "Campo obligatorio"
    if (!form.ciudad) nuevosErrores.ciudad = "Campo obligatorio"
    return nuevosErrores
  }

  async function handleGuardar() {
    const err = validarNuevo()
    if (Object.keys(err).length > 0) { setErrores(err); return }
    setGuardando(true)
    try {
      const res = await fetchAuth(`${API_URL}/clientes`, {
        method: "POST",
        body: JSON.stringify({
          razon_social: form.razon_social,
          cuit: form.cuil_cuit,
          email: form.email,
          telefono: form.telefono,
          direccion: form.direccion,
          ciudad: form.ciudad,
          provincia: form.provincia,
          id_zona: form.id_zona || null,
        }),
      })
      if (!res.ok) {
        const errData = await res.json()
        showToast(errData.error || "Error al crear el cliente.", "error")
        return
      }
      await cargarClientes()
      cerrarModal()
      showToast("Cliente creado correctamente.", "exito")
    } catch {
      showToast("No se pudo conectar con el servidor.", "error")
    } finally {
      setGuardando(false)
    }
  }

  async function abrirDetalle(cliente) {
    setClienteDetalle(cliente)
    setFormDatos({
      razon_social: cliente.razon_social || "",
      cuit: cliente.cuit || "",
      telefono: cliente.telefono || "",
      direccion: cliente.direccion || "",
      ciudad: cliente.ciudad || "",
      provincia: cliente.provincia || "",
      id_zona: cliente.id_zona || "",
    })
    setFormNotas(cliente.notas_internas || "")
    setPestana("datos")
    setPassTemp("")
    setModalDetalle(true)

    setCargandoPedidos(true)
    try {
      const res = await fetchAuth(`${API_URL}/clientes/${cliente.id_cliente}/pedidos`)
      const data = await res.json()
      setPedidosCliente(Array.isArray(data) ? data : [])
    } catch {
      setPedidosCliente([])
    } finally {
      setCargandoPedidos(false)
    }
  }

  function cerrarDetalle() {
    setModalDetalle(false)
    setClienteDetalle(null)
    setPedidosCliente([])
    setPassTemp("")
  }

  async function handleAprobar() {
    if (!clienteDetalle) return
    setAprobando(true)
    try {
      const res = await fetchAuth(`${API_URL}/clientes/${clienteDetalle.id_cliente}/aprobar`, { method: "PATCH" })
      if (!res.ok) {
        const errData = await res.json()
        showToast(errData.error || "Error al aprobar el cliente.", "error")
        return
      }
      showToast(`${clienteDetalle.razon_social} fue aprobado correctamente.`, "exito")
      await cargarClientes()
      cerrarDetalle()
    } catch {
      showToast("No se pudo conectar con el servidor.", "error")
    } finally {
      setAprobando(false)
    }
  }

  async function handleToggle() {
    if (!clienteDetalle) return
    try {
      await fetchAuth(`${API_URL}/clientes/${clienteDetalle.id_cliente}/toggle`, { method: "PATCH" })
      const estado = clienteDetalle.activo ? "desactivado" : "activado"
      showToast(`Cliente ${estado} correctamente.`, "exito")
      await cargarClientes()
      cerrarDetalle()
    } catch {
      showToast("No se pudo cambiar el estado.", "error")
    }
  }

  async function handleGuardarDatos() {
    if (!clienteDetalle) return
    setGuardandoDatos(true)
    try {
      const res = await fetchAuth(`${API_URL}/clientes/${clienteDetalle.id_cliente}`, {
        method: "PUT",
        body: JSON.stringify({
          razon_social: formDatos.razon_social,
          cuit: formDatos.cuit,
          telefono: formDatos.telefono,
          direccion: formDatos.direccion,
          ciudad: formDatos.ciudad,
          provincia: formDatos.provincia,
          id_zona: formDatos.id_zona || null,
        }),
      })
      if (!res.ok) {
        const errData = await res.json()
        showToast(errData.error || "Error al guardar los datos.", "error")
        return
      }
      showToast("Datos actualizados correctamente.", "exito")
      await cargarClientes()
    } catch {
      showToast("No se pudo conectar con el servidor.", "error")
    } finally {
      setGuardandoDatos(false)
    }
  }

  async function handleGuardarNotas() {
    if (!clienteDetalle) return
    setGuardandoNotas(true)
    try {
      const res = await fetchAuth(`${API_URL}/clientes/${clienteDetalle.id_cliente}/notas`, {
        method: "PATCH",
        body: JSON.stringify({ notas_internas: formNotas }),
      })
      if (!res.ok) {
        const errData = await res.json()
        showToast(errData.error || "Error al guardar las notas.", "error")
        return
      }
      showToast("Notas guardadas correctamente.", "exito")
      await cargarClientes()
    } catch {
      showToast("No se pudo conectar con el servidor.", "error")
    } finally {
      setGuardandoNotas(false)
    }
  }

  async function handleResetPass() {
    if (!clienteDetalle) return
    try {
      const res = await fetchAuth(`${API_URL}/clientes/${clienteDetalle.id_cliente}/reset-password`, { method: "PATCH" })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || "Error al resetear la contraseña.", "error")
        return
      }
      setPassTemp(data.password_temporal)
      showToast("Contraseña reseteada correctamente.", "exito")
    } catch {
      showToast("No se pudo conectar con el servidor.", "error")
    }
  }

  if (cargando) return <div style={{ padding: "0" }}><SkeletonTabla filas={5} columnas={6} /></div>

  return (
    <div>
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Clientes</h1>
          <p style={estilos.subtitulo}>Gestión de clientes registrados · Hacé clic en una fila para ver el detalle</p>
        </div>
        <button style={estilos.botonPrimario} onClick={abrirNuevo}>
          + Nuevo cliente
        </button>
      </div>

      {pendientes.length > 0 && (
        <div style={estilos.alertaPendientes}>
          <p style={{ fontWeight: "700", fontSize: "0.875rem" }}>
            {pendientes.length} cliente{pendientes.length > 1 ? "s" : ""} pendiente{pendientes.length > 1 ? "s" : ""} de aprobación
          </p>
          <button
            style={{ marginLeft: "auto", fontSize: "0.8rem", fontWeight: "700", color: "var(--azul)", cursor: "pointer" }}
            onClick={() => setFiltroActivo("pendiente")}
          >
            Ver pendientes →
          </button>
        </div>
      )}

      <div style={estilos.barra}>
        <input
          style={estilos.buscador}
          placeholder="Buscar por nombre, email o ciudad..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div style={estilos.filtros}>
          {[
            { key: "todos", label: "Todos" },
            { key: "activo", label: "Activos" },
            { key: "inactivo", label: "Inactivos" },
            {
              key: "pendiente",
              label: `Pendientes${pendientes.length > 0 ? ` (${pendientes.length})` : ""}`,
            },
          ].map((f) => (
            <button
              key={f.key}
              style={filtroActivo === f.key ? { ...estilos.filtro, ...estilos.filtroActivo } : estilos.filtro}
              onClick={() => setFiltroActivo(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={estilos.tabla}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={estilos.thead}>
              <th style={estilos.th}>Razón social</th>
              <th style={estilos.th}>CUIL / CUIT</th>
              <th style={estilos.th}>Email</th>
              <th style={estilos.th}>Ciudad</th>
              <th style={estilos.th}>Zona</th>
              <th style={estilos.th}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} style={estilos.vacio}>
                  {busqueda || filtroActivo !== "todos"
                    ? "Sin resultados para los filtros aplicados."
                    : "No hay clientes registrados aún."}
                </td>
              </tr>
            )}
            {clientesFiltrados.map((c) => {
              const esPendiente = !c.fecha_aprobacion
              return (
                <tr
                  key={c.id_cliente}
                  style={{ ...estilos.fila, cursor: "pointer" }}
                  onClick={() => abrirDetalle(c)}
                >
                  <td style={{ ...estilos.td, fontWeight: "600" }}>{c.razon_social}</td>
                  <td style={{ ...estilos.td, color: "var(--text-secondary)", fontFamily: "monospace" }}>
                    {c.cuit || "—"}
                  </td>
                  <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{c.email}</td>
                  <td style={estilos.td}>{c.ciudad}</td>
                  <td style={estilos.td}>{c.zona || "—"}</td>
                  <td style={estilos.td}>
                    {esPendiente ? (
                      <span style={estilos.badgePendiente}>Pendiente</span>
                    ) : c.activo ? (
                      <span style={estilos.badgeActivo}>Activo</span>
                    ) : (
                      <span style={estilos.badgeInactivo}>Inactivo</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modalAbierto && (
        <Modal titulo="Nuevo cliente" onCerrar={cerrarModal}>
          <div style={estilos.formGrilla}>
            <Campo label="Razón social" error={errores.razon_social}>
              <input style={estilos.input} name="razon_social" value={form.razon_social} onChange={handleChange} />
            </Campo>
            <Campo label="CUIL / CUIT" error={errores.cuil_cuit}>
              <input
                style={estilos.input}
                name="cuil_cuit"
                value={form.cuil_cuit}
                placeholder="XX-XXXXXXXX-X"
                onChange={(e) => {
                  const solo = e.target.value.replace(/\D/g, '').slice(0, 11)
                  setForm(prev => ({ ...prev, cuil_cuit: solo }))
                  if (errores.cuil_cuit) setErrores(prev => ({ ...prev, cuil_cuit: "" }))
                }}
                onBlur={(e) => setForm(prev => ({ ...prev, cuil_cuit: formatearCuit(e.target.value) }))}
              />
            </Campo>
            <Campo label="Email" error={errores.email}>
              <input style={estilos.input} name="email" value={form.email} onChange={handleChange} />
            </Campo>
            <Campo label="Teléfono" error={errores.telefono}>
              <input style={estilos.input} name="telefono" value={form.telefono} onChange={handleChange} />
            </Campo>
            <Campo label="Provincia" error={errores.provincia}>
              <select
                style={estilos.input}
                value={form.provincia}
                onChange={(e) => {
                  handleProvinciaChange(e.target.value)
                  if (errores.provincia) setErrores(prev => ({ ...prev, provincia: "" }))
                }}
              >
                <option value="">Seleccioná una provincia</option>
                {provincias.map(p => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Ciudad" error={errores.ciudad}>
              <select
                style={estilos.input}
                value={form.ciudad}
                disabled={!form.provincia}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, ciudad: e.target.value }))
                  if (errores.ciudad) setErrores(prev => ({ ...prev, ciudad: "" }))
                }}
              >
                <option value="">{form.provincia ? "Seleccioná una ciudad" : "Primero seleccioná provincia"}</option>
                {ciudades.map(c => <option key={c.nombre} value={c.nombre}>{c.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Dirección">
              <input style={estilos.input} name="direccion" value={form.direccion} onChange={handleChange} />
            </Campo>
            <Campo label="Zona">
              <select style={estilos.input} name="id_zona" value={form.id_zona} onChange={handleChange}>
                <option value="">Sin zona</option>
                {zonas.filter((z) => z.activa).map((z) => (
                  <option key={z.id_zona} value={z.id_zona}>{z.nombre}</option>
                ))}
              </select>
            </Campo>
          </div>
          <div style={estilos.formAcciones}>
            <button style={estilos.botonSecundario} onClick={cerrarModal}>Cancelar</button>
            <button style={estilos.botonPrimario} onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Creando..." : "Crear cliente"}
            </button>
          </div>
        </Modal>
      )}

      {modalDetalle && clienteDetalle && (
        <Modal titulo={clienteDetalle.razon_social} onCerrar={cerrarDetalle} ancho="800px">

          <div style={estilos.detalleHeader}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-hint)" }}>{clienteDetalle.email}</span>
              <span style={{ color: "var(--border)" }}>·</span>
              {!clienteDetalle.fecha_aprobacion ? (
                <span style={estilos.badgePendiente}>Pendiente</span>
              ) : clienteDetalle.activo ? (
                <span style={estilos.badgeActivo}>Activo</span>
              ) : (
                <span style={estilos.badgeInactivo}>Inactivo</span>
              )}
            </div>
            <span style={{ fontSize: "0.78rem", color: "var(--text-hint)" }}>
              Alta: {clienteDetalle.fecha_alta ? new Date(clienteDetalle.fecha_alta).toLocaleDateString("es-AR") : "—"}
            </span>
          </div>

          <div style={estilos.tabs}>
            {[
              { key: "datos", label: "Datos" },
              { key: "pedidos", label: `Pedidos${pedidosCliente.length > 0 ? ` (${pedidosCliente.length})` : ""}` },
              { key: "notas", label: "Notas" },
              { key: "cuenta", label: "Cuenta" },
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

          {pestana === "datos" && (
            <div>
              <div style={estilos.formGrilla}>
                <Campo label="Razón social">
                  <input style={estilos.input} value={formDatos.razon_social} onChange={(e) => setFormDatos((p) => ({ ...p, razon_social: e.target.value }))} />
                </Campo>
                <Campo label="CUIL / CUIT">
                  <input style={estilos.input} value={formDatos.cuit} onChange={(e) => setFormDatos((p) => ({ ...p, cuit: e.target.value }))} />
                </Campo>
                <Campo label="Teléfono">
                  <input style={estilos.input} value={formDatos.telefono} onChange={(e) => setFormDatos((p) => ({ ...p, telefono: e.target.value }))} />
                </Campo>
                <Campo label="Ciudad">
                  <input style={estilos.input} value={formDatos.ciudad} onChange={(e) => setFormDatos((p) => ({ ...p, ciudad: e.target.value }))} />
                </Campo>
                <Campo label="Dirección">
                  <input style={estilos.input} value={formDatos.direccion} onChange={(e) => setFormDatos((p) => ({ ...p, direccion: e.target.value }))} />
                </Campo>
                <Campo label="Provincia">
                  <input style={estilos.input} value={formDatos.provincia} onChange={(e) => setFormDatos((p) => ({ ...p, provincia: e.target.value }))} />
                </Campo>
                <Campo label="Zona">
                  <select style={estilos.input} value={formDatos.id_zona} onChange={(e) => setFormDatos((p) => ({ ...p, id_zona: e.target.value }))}>
                    <option value="">Sin zona</option>
                    {zonas.filter((z) => z.activa).map((z) => (
                      <option key={z.id_zona} value={z.id_zona}>{z.nombre}</option>
                    ))}
                  </select>
                </Campo>
              </div>
              <div style={estilos.formAcciones}>
                <button style={estilos.botonPrimario} onClick={handleGuardarDatos} disabled={guardandoDatos}>
                  {guardandoDatos ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          )}

          {pestana === "pedidos" && (
            <div>
              {cargandoPedidos ? (
                <p style={estilos.vacioPestana}>Cargando pedidos...</p>
              ) : pedidosCliente.length === 0 ? (
                <p style={estilos.vacioPestana}>Este cliente no tiene pedidos registrados aún.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={estilos.thead}>
                      <th style={estilos.th}>Nro. pedido</th>
                      <th style={estilos.th}>Fecha</th>
                      <th style={estilos.th}>Estado</th>
                      <th style={estilos.th}>Unidades</th>
                      <th style={estilos.th}>Ciudad entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pedidosCliente.map((p) => (
                      <tr key={p.id_pedido} style={estilos.fila}>
                        <td style={{ ...estilos.td, fontWeight: "600" }}>{p.nro_pedido}</td>
                        <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{p.fecha_pedido_fmt}</td>
                        <td style={estilos.td}>
                          <span style={getBadgeEstado(p.estado)}>{p.estado}</span>
                        </td>
                        <td style={{ ...estilos.td, textAlign: "center" }}>{p.total_unidades}</td>
                        <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{p.ciudad_entrega || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {pestana === "notas" && (
            <div>
              <p style={{ fontSize: "0.8rem", color: "var(--text-hint)", marginBottom: "0.75rem" }}>
                Las notas internas son solo visibles para el administrador. Usálas para registrar aclaraciones, historial de contacto, condiciones especiales, etc.
              </p>
              <textarea
                style={{ ...estilos.input, height: "150px", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }}
                value={formNotas}
                onChange={(e) => setFormNotas(e.target.value)}
                placeholder="Ej: Cliente con pagos puntuales. Prefiere envíos los martes. Contactar a María al 351-XXXXXXX..."
              />
              <div style={{ ...estilos.formAcciones, marginTop: "1rem" }}>
                <button style={estilos.botonPrimario} onClick={handleGuardarNotas} disabled={guardandoNotas}>
                  {guardandoNotas ? "Guardando..." : "Guardar notas"}
                </button>
              </div>
            </div>
          )}

          {pestana === "cuenta" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              <div style={estilos.cuentaSeccion}>
                <div>
                  <p style={estilos.cuentaLabel}>Estado de la cuenta</p>
                  <p style={estilos.cuentaDesc}>
                    {!clienteDetalle.fecha_aprobacion
                      ? "Esta cuenta fue creada por el cliente pero aún no fue aprobada."
                      : clienteDetalle.activo
                        ? "La cuenta está activa. El cliente puede ingresar y hacer pedidos."
                        : "La cuenta fue desactivada manualmente por el administrador."}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  {!clienteDetalle.fecha_aprobacion ? (
                    <button style={estilos.botonPrimario} onClick={handleAprobar} disabled={aprobando}>
                      {aprobando ? "Aprobando..." : "✓ Aprobar"}
                    </button>
                  ) : (
                    <button
                      style={clienteDetalle.activo ? estilos.botonPeligro : estilos.botonPrimario}
                      onClick={handleToggle}
                    >
                      {clienteDetalle.activo ? "Desactivar" : "Activar"}
                    </button>
                  )}
                </div>
              </div>

              <div style={estilos.cuentaSeccion}>
                <div>
                  <p style={estilos.cuentaLabel}>Resetear contraseña</p>
                  <p style={estilos.cuentaDesc}>
                    Genera una contraseña temporal que podés comunicarle al cliente.
                  </p>
                  {passTemp && (
                    <div style={estilos.passTempBox}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Contraseña temporal:</span>
                      <code style={{ fontWeight: "700", fontSize: "1rem", color: "var(--verde-oscuro)", letterSpacing: "0.5px" }}>
                        {passTemp}
                      </code>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-hint)" }}>
                        Comunicásela al cliente y pedile que la cambie.
                      </span>
                    </div>
                  )}
                </div>
                <button style={{ ...estilos.botonSecundario, flexShrink: 0 }} onClick={handleResetPass}>
                  Resetear
                </button>
              </div>

              <div style={{ fontSize: "0.8rem", color: "var(--text-hint)", borderTop: "1px solid var(--border)", paddingTop: "1rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                <p><strong style={{ color: "var(--text-secondary)" }}>Email:</strong> {clienteDetalle.email}</p>
                <p>
                  <strong style={{ color: "var(--text-secondary)" }}>Fecha de alta:</strong>{" "}
                  {clienteDetalle.fecha_alta ? new Date(clienteDetalle.fecha_alta).toLocaleDateString("es-AR") : "—"}
                </p>
                {clienteDetalle.fecha_aprobacion && (
                  <p>
                    <strong style={{ color: "var(--text-secondary)" }}>Aprobado el:</strong>{" "}
                    {new Date(clienteDetalle.fecha_aprobacion).toLocaleDateString("es-AR")}
                  </p>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}

function Campo({ label, error, children }) {
  return (
    <div>
      <label style={estilos.label}>{label}</label>
      {children}
      {error && <p style={estilos.errorCampo}>{error}</p>}
    </div>
  )
}

const estilos = {
  ...estilosComunes,
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },

  alertaPendientes: {
    display: "flex", alignItems: "center", gap: "0.75rem",
    backgroundColor: "var(--azul-claro)", border: "1.5px solid var(--azul)",
    borderRadius: "var(--radius-lg)", padding: "0.85rem 1.25rem",
    marginBottom: "1rem", color: "var(--azul)",
  },

  barra: { display: "flex", gap: "1rem", marginBottom: "1.25rem", alignItems: "center" },
  buscador: {
    flex: 1, padding: "0.65rem 1rem",
    border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)",
    fontSize: "0.875rem", color: "var(--text-primary)",
    backgroundColor: "var(--bg-surface)", boxShadow: "var(--shadow-xs)",
  },
  filtro: { padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.8rem", border: "1.5px solid var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)", cursor: "pointer", fontWeight: "500" },
  filtroActivo: { backgroundColor: "var(--verde-claro)", border: "1.5px solid var(--verde)", color: "var(--verde-oscuro)", fontWeight: "700" },
  vacio: { padding: "2.5rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem" },

  badgeActivo: { display: "inline-flex", alignItems: "center", padding: "0.25rem 0.7rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600", backgroundColor: "var(--verde-claro)", color: "var(--verde-oscuro)" },
  badgeInactivo: { display: "inline-flex", alignItems: "center", padding: "0.25rem 0.7rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600", backgroundColor: "var(--bg-surface-3)", color: "var(--text-hint)", border: "1px solid var(--border)" },
  badgePendiente: { display: "inline-flex", alignItems: "center", padding: "0.25rem 0.7rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600", backgroundColor: "var(--azul-claro)", color: "var(--azul)" },

  detalleHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 0 1rem 0", borderBottom: "1px solid var(--border)", marginBottom: "0.75rem" },
  tabs: { display: "flex", gap: "0.35rem", marginBottom: "1.25rem" },
  tab: { padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.82rem", border: "1.5px solid var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface-2)", cursor: "pointer", fontWeight: "500" },
  tabActivo: { backgroundColor: "var(--verde-claro)", border: "1.5px solid var(--verde)", color: "var(--verde-oscuro)", fontWeight: "700" },
  vacioPestana: { textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem", padding: "2rem" },

  cuentaSeccion: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", padding: "1rem", backgroundColor: "var(--bg-surface-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" },
  cuentaLabel: { fontWeight: "700", fontSize: "0.875rem", color: "var(--text-primary)", marginBottom: "0.2rem" },
  cuentaDesc: { fontSize: "0.8rem", color: "var(--text-secondary)", lineHeight: 1.5 },
  passTempBox: { display: "flex", flexDirection: "column", gap: "0.2rem", marginTop: "0.75rem", padding: "0.65rem 0.9rem", backgroundColor: "var(--verde-claro)", borderRadius: "var(--radius-md)", border: "1px solid var(--verde)" },

  formGrilla: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.1rem", marginBottom: "1.5rem" },
  label: { display: "block", fontSize: "0.78rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.4rem" },
  input: { width: "100%", padding: "0.65rem 0.85rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)", boxSizing: "border-box" },
  errorCampo: { fontSize: "0.75rem", color: "var(--rojo)", marginTop: "0.3rem" },
  formAcciones: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.25rem" },

  botonPrimario: { padding: "0.65rem 1.4rem", backgroundColor: "var(--verde)", color: "white", borderRadius: "var(--radius-md)", fontWeight: "700", fontSize: "0.875rem", cursor: "pointer", boxShadow: "var(--shadow-verde)" },
  botonSecundario: { padding: "0.65rem 1.4rem", backgroundColor: "var(--bg-surface)", color: "var(--text-secondary)", borderRadius: "var(--radius-md)", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer", border: "1.5px solid var(--border)" },
  botonPeligro: { padding: "0.65rem 1.4rem", backgroundColor: "var(--rojo-claro)", color: "var(--rojo)", borderRadius: "var(--radius-md)", fontWeight: "700", fontSize: "0.875rem", cursor: "pointer", border: "1.5px solid var(--rojo)" },
}
