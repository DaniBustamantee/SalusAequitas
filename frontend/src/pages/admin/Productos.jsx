import { useState } from "react"
import Modal from "../../components/ui/Modal"
import { SkeletonTabla } from "../../components/ui/Skeleton"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { useToast } from "../../context/ToastContext"
import { estilosComunes } from "../../styles/estilosComunes"
import { useCargarDatos } from "../../hooks/useCargarDatos"

const FORM_VACIO = {
  nombre: "",
  codigo: "",
  descripcion: "",
  precio_unitario: "",
  stock_actual: "",
  stock_minimo: "",
  stock_critico: "",
}

function estadoStock(p) {
  if (p.stock_actual <= p.stock_critico) return { texto: "Crítico", color: "var(--rojo)", bg: "var(--rojo-claro)" }
  if (p.stock_actual <= p.stock_minimo) return { texto: "Stock bajo", color: "var(--naranja)", bg: "var(--naranja-claro)" }
  return { texto: "Normal", color: "var(--verde-oscuro)", bg: "var(--verde-claro)" }
}

export default function Productos() {
  const { showToast } = useToast()
  const { datos: [productos], cargando, recargar: cargarProductos } = useCargarDatos([`${API_URL}/productos`])
  const [busqueda, setBusqueda] = useState("")
  const [filtroActivo, setFiltroActivo] = useState("todos")
  const [modalAbierto, setModalAbierto] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(FORM_VACIO)
  const [errores, setErrores] = useState({})

  const filtrados = productos.filter((p) => {
    const coincideBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo.toLowerCase().includes(busqueda.toLowerCase())
    const coincideEstado =
      filtroActivo === "todos" ||
      (filtroActivo === "activo" && p.activo) ||
      (filtroActivo === "inactivo" && !p.activo)
    return coincideBusqueda && coincideEstado
  })

  function abrirNuevo() {
    setEditando(null); setForm(FORM_VACIO); setErrores({}); setModalAbierto(true)
  }
  function abrirEditar(p) {
    setEditando(p)
    setForm({
      nombre: p.nombre, codigo: p.codigo, descripcion: p.descripcion,
      precio_unitario: p.precio_unitario, stock_actual: p.stock_actual,
      stock_minimo: p.stock_minimo, stock_critico: p.stock_critico
    })
    setErrores({}); setModalAbierto(true)
  }
  function cerrarModal() { setModalAbierto(false); setEditando(null); setForm(FORM_VACIO); setErrores({}) }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (errores[e.target.name]) setErrores((prev) => ({ ...prev, [e.target.name]: "" }))
  }

  function validar() {
    const nuevosErrores = {}
    if (!form.nombre.trim()) nuevosErrores.nombre = "Campo obligatorio"
    if (!form.codigo.trim()) nuevosErrores.codigo = "Campo obligatorio"
    if (form.precio_unitario === "" || isNaN(form.precio_unitario)) nuevosErrores.precio_unitario = "Debe ser un número"
    if (form.stock_actual === "" || isNaN(form.stock_actual)) nuevosErrores.stock_actual = "Debe ser un número"
    if (form.stock_minimo === "" || isNaN(form.stock_minimo)) nuevosErrores.stock_minimo = "Debe ser un número"
    if (form.stock_critico === "" || isNaN(form.stock_critico)) nuevosErrores.stock_critico = "Debe ser un número"
    return nuevosErrores
  }

  async function handleGuardar() {
    const erroresValidacion = validar()
    if (Object.keys(erroresValidacion).length > 0) {
      setErrores(erroresValidacion)
      return
    }

    const url = editando ? `${API_URL}/productos/${editando.id_producto}` : `${API_URL}/productos`
    const method = editando ? "PUT" : "POST"

    try {
      await fetchAuth(url, { method, body: JSON.stringify(form) })
      await cargarProductos()
      cerrarModal()
    } catch {
      setErrores({ nombre: "No se pudo guardar. Intentá de nuevo." })
    }
  }

  async function handleToggle(id) {
    try {
      const res = await fetchAuth(`${API_URL}/productos/${id}/toggle`, { method: "PATCH" })
      if (!res.ok) {
        const err = await res.json()
        showToast(err.error || "No se pudo cambiar el estado.", "error")
        return
      }
      await cargarProductos()
    } catch {
      showToast("No se pudo conectar con el servidor.", "error")
    }
  }

  if (cargando) return <div style={{ padding: "0" }}><SkeletonTabla filas={5} columnas={5} /></div>

  return (
    <div>

      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Productos</h1>
          <p style={estilos.subtitulo}>Gestión de productos terminados y niveles de stock</p>
        </div>
        <button style={estilos.botonPrimario} onClick={abrirNuevo}>+ Nuevo producto</button>
      </div>

      <div style={estilos.barra}>
        <input
          style={estilos.buscador}
          placeholder="Buscar por nombre o código..."
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

      {filtrados.length === 0 ? (
        <div style={estilos.vacio}>No se encontraron productos.</div>
      ) : (
        <div style={estilos.grilla}>
          {filtrados.map((p) => {
            const stock = estadoStock(p)
            const pctStock = Math.min(100, Math.round((p.stock_actual / (p.stock_minimo * 2)) * 100))
            return (
              <div key={p.id_producto} style={{ ...estilos.card, opacity: p.activo ? 1 : 0.65 }}>

                <div style={estilos.imagenWrap}>
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt={p.nombre} style={estilos.imagen} />
                  ) : (
                    <div style={estilos.imagenPlaceholder}>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-hint)" }}>Sin imagen</span>
                    </div>
                  )}

                  <span style={{ ...estilos.badgeEstado, backgroundColor: p.activo ? "var(--verde-claro)" : "var(--bg-surface-3)", color: p.activo ? "var(--verde-oscuro)" : "var(--text-hint)" }}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div style={estilos.cardCuerpo}>
                  <p style={estilos.cardCodigo}>{p.codigo}</p>
                  <h3 style={estilos.cardNombre}>{p.nombre}</h3>
                  <p style={estilos.cardDesc}>{p.descripcion}</p>

                  <p style={estilos.cardPrecio}>${Number(p.precio_unitario).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>

                  <div style={estilos.stockSection}>
                    <div style={estilos.stockRow}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>Stock actual</span>
                      <span style={{ ...estilos.badgeStock, backgroundColor: stock.bg, color: stock.color }}>
                        {stock.texto}
                      </span>
                    </div>
                    <div style={estilos.stockBarWrap}>
                      <div style={{ ...estilos.stockBarFill, width: `${pctStock}%`, backgroundColor: stock.color }} />
                    </div>
                    <div style={estilos.stockNumeros}>
                      <span style={{ fontWeight: "700", color: stock.color }}>{p.stock_actual} u.</span>
                      <span style={{ color: "var(--text-hint)", fontSize: "0.78rem" }}>reorden {p.stock_minimo} · seg. {p.stock_critico}</span>
                    </div>
                  </div>

                  <div style={estilos.cardAcciones}>
                    <button style={estilos.btnEditar} onClick={() => abrirEditar(p)}>Editar</button>
                    <button
                      style={{ ...estilos.btnToggle, color: p.activo ? "var(--rojo)" : "var(--verde)", borderColor: p.activo ? "var(--rojo)" : "var(--verde)" }}
                      onClick={() => handleToggle(p.id_producto)}
                    >
                      {p.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalAbierto && (
        <Modal titulo={editando ? "Editar producto" : "Nuevo producto"} onCerrar={cerrarModal}>
          <div style={estilos.formGrilla}>
            <Campo label="Nombre" error={errores.nombre}>
              <input style={estilos.input} name="nombre" value={form.nombre} onChange={handleChange} />
            </Campo>
            <Campo label="Código" error={errores.codigo}>
              <input style={estilos.input} name="codigo" value={form.codigo} onChange={handleChange} />
            </Campo>
            <Campo label="Precio unitario ($)" error={errores.precio_unitario}>
              <input style={estilos.input} name="precio_unitario" value={form.precio_unitario} onChange={handleChange} type="number" min="0" />
            </Campo>
            <Campo label="Stock actual" error={errores.stock_actual}>
              <input style={estilos.input} name="stock_actual" value={form.stock_actual} onChange={handleChange} type="number" min="0" />
            </Campo>
            <Campo label="Punto de reorden" error={errores.stock_minimo}>
              <input style={estilos.input} name="stock_minimo" value={form.stock_minimo} onChange={handleChange} type="number" min="0" />
            </Campo>
            <Campo label="Stock de seguridad" error={errores.stock_critico}>
              <input style={estilos.input} name="stock_critico" value={form.stock_critico} onChange={handleChange} type="number" min="0" />
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
              {editando ? "Guardar cambios" : "Crear producto"}
            </button>
          </div>
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
      {error && <p style={estilos.error}>{error}</p>}
    </div>
  )
}

const estilos = {
  ...estilosComunes,
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },

  barra: { display: "flex", gap: "1rem", marginBottom: "1.5rem", alignItems: "center" },
  buscador: { flex: 1, padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)" },
  filtro: { padding: "0.5rem 1rem", borderRadius: "var(--radius-md)", fontSize: "0.8rem", border: "1.5px solid var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)", cursor: "pointer", fontWeight: "500" },
  filtroActivo: { backgroundColor: "var(--verde-claro)", border: "1.5px solid var(--verde)", color: "var(--verde-oscuro)", fontWeight: "700" },

  grilla: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" },
  vacio: { padding: "3rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem" },

  card: {
    backgroundColor: "var(--bg-surface)",
    borderRadius: "var(--radius-lg)",
    boxShadow: "var(--shadow-md)",
    border: "1px solid var(--border)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    transition: "box-shadow var(--transition-normal), transform var(--transition-normal)",
  },
  imagenWrap: {
    position: "relative",
    backgroundColor: "var(--bg-surface-2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "200px",
    overflow: "hidden",
  },
  imagen: {
    height: "180px",
    width: "auto",
    objectFit: "contain",
    filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))",
    transition: "transform var(--transition-slow)",
  },
  imagenPlaceholder: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "100%", height: "100%",
  },
  badgeEstado: {
    position: "absolute", top: "10px", right: "10px",
    padding: "0.2rem 0.65rem",
    borderRadius: "var(--radius-full)",
    fontSize: "0.72rem",
    fontWeight: "700",
  },

  cardCuerpo: { padding: "1.25rem", display: "flex", flexDirection: "column", flex: 1 },
  cardCodigo: { fontSize: "0.72rem", color: "var(--text-hint)", fontWeight: "600", letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: "0.25rem" },
  cardNombre: { fontSize: "1rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "0.3rem", letterSpacing: "-0.2px" },
  cardDesc: { fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.75rem", lineHeight: 1.5 },
  cardPrecio: { fontSize: "1.35rem", fontWeight: "800", color: "var(--verde-oscuro)", letterSpacing: "-0.3px", marginBottom: "1rem" },

  stockSection: { marginBottom: "1.1rem" },
  stockRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" },
  badgeStock: { padding: "0.15rem 0.6rem", borderRadius: "var(--radius-full)", fontSize: "0.72rem", fontWeight: "700" },
  stockBarWrap: { height: "6px", backgroundColor: "var(--bg-surface-3)", borderRadius: "var(--radius-full)", overflow: "hidden", marginBottom: "0.4rem" },
  stockBarFill: { height: "100%", borderRadius: "var(--radius-full)", transition: "width 0.4s ease" },
  stockNumeros: { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-secondary)" },

  cardAcciones: { display: "flex", gap: "0.5rem", marginTop: "auto" },
  btnEditar: {
    flex: 1, padding: "0.55rem", border: "1.5px solid var(--azul)",
    color: "var(--azul)", borderRadius: "var(--radius-md)", fontSize: "0.8rem",
    fontWeight: "700", cursor: "pointer", backgroundColor: "transparent",
  },
  btnToggle: {
    flex: 1, padding: "0.55rem", borderRadius: "var(--radius-md)", fontSize: "0.8rem",
    fontWeight: "700", cursor: "pointer", backgroundColor: "transparent",
    border: "1.5px solid",
  },

  formGrilla: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.1rem", marginBottom: "1.5rem" },
  label: { display: "block", fontSize: "0.78rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.4rem" },
  input: { width: "100%", padding: "0.65rem 0.85rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)" },
  error: { fontSize: "0.75rem", color: "var(--rojo)", marginTop: "0.3rem" },
  botonPrimario: { padding: "0.65rem 1.4rem", backgroundColor: "var(--verde)", color: "white", borderRadius: "var(--radius-md)", fontWeight: "700", boxShadow: "var(--shadow-verde)", fontSize: "0.875rem", cursor: "pointer" },
  botonSecundario: { padding: "0.65rem 1.4rem", backgroundColor: "var(--bg-surface)", color: "var(--text-secondary)", borderRadius: "var(--radius-md)", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer", border: "1.5px solid var(--border)" },
}
