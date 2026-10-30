import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { estilosComunes } from "../../styles/estilosComunes"
import Campo from "../../components/ui/Campo"

const FORM_VACIO = {
  direccion_entrega: "",
  ciudad_entrega: "",
  contacto_receptor: "",
  telefono_receptor: "",
  notas: "",
}

export default function NuevoPedido() {
  const navigate = useNavigate()

  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(FORM_VACIO)
  const [items, setItems] = useState([])
  const [errores, setErrores] = useState({})
  const [erroresStock, setErroresStock] = useState([])
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function cargar() {
      try {
        const res = await fetchAuth(`${API_URL}/productos`)
        const data = await res.json()
        setProductos(Array.isArray(data) ? data.filter(p => p.activo) : [])
      } catch {
        setProductos([])
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [])

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (errores[e.target.name]) setErrores((prev) => ({ ...prev, [e.target.name]: "" }))
  }

  function actualizarItem(idx, cantidad) {
    setItems((prev) => prev.map((item, i) =>
      i === idx ? { ...item, cantidad: Number(cantidad) } : item
    ))
  }

  function quitarItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  function calcularTotal() {
    return items.reduce((acc, item) => {
      const producto = productos.find((p) => p.id_producto === item.id_producto)
      return acc + (producto?.precio_unitario || 0) * Number(item.cantidad)
    }, 0)
  }

  function validar() {
    const nuevosErrores = {}
    if (!form.direccion_entrega.trim()) nuevosErrores.direccion_entrega = "Campo obligatorio"
    if (!form.ciudad_entrega.trim()) nuevosErrores.ciudad_entrega = "Campo obligatorio"
    if (!form.contacto_receptor.trim()) nuevosErrores.contacto_receptor = "Campo obligatorio"
    if (items.length === 0) nuevosErrores.items = "Agregá al menos un producto"
    return nuevosErrores
  }

  async function handleGuardar() {
    const erroresValidacion = validar()
    if (Object.keys(erroresValidacion).length > 0) {
      setErrores(erroresValidacion)
      return
    }
    if (guardando) return
    setGuardando(true)
    setErroresStock([])

    try {
      const res = await fetchAuth(`${API_URL}/pedidos`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          items: items.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad })),
        }),
      })

      if (res.ok) {
        navigate("/cliente/mis-pedidos")
      } else {
        const data = await res.json()
        if (data.detalle) {
          setErroresStock(data.detalle)
        } else {
          setErrores({ direccion_entrega: data.error || "Error al crear el pedido." })
        }
      }
    } catch {
      setErrores({ direccion_entrega: "Error de conexión. Intentá de nuevo." })
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <p style={{ padding: "2rem", color: "var(--text-secondary)" }}>Cargando...</p>

  return (
    <div>
      <div style={estilos.encabezado}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button style={estilos.botonVolver} onClick={() => navigate("/cliente/mis-pedidos")}>
            ← Volver
          </button>
          <div>
            <h1 style={estilos.titulo}>Nuevo pedido</h1>
            <p style={estilos.subtitulo}>Completá los datos de tu pedido</p>
          </div>
        </div>
      </div>

      <div style={estilos.grilla}>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={estilos.card}>
            <h2 style={estilos.cardTitulo}>Datos de entrega</h2>
            <div style={estilos.formGrilla}>
              <Campo label="Dirección" error={errores.direccion_entrega}>
                <input style={estilos.input} name="direccion_entrega" value={form.direccion_entrega} onChange={handleChange} />
              </Campo>
              <Campo label="Ciudad" error={errores.ciudad_entrega}>
                <input style={estilos.input} name="ciudad_entrega" value={form.ciudad_entrega} onChange={handleChange} />
              </Campo>
              <Campo label="Contacto receptor" error={errores.contacto_receptor}>
                <input style={estilos.input} name="contacto_receptor" value={form.contacto_receptor} onChange={handleChange} />
              </Campo>
              <Campo label="Teléfono">
                <input style={estilos.input} name="telefono_receptor" value={form.telefono_receptor} onChange={handleChange} />
              </Campo>
              <div style={{ gridColumn: "1 / -1" }}>
                <Campo label="Notas">
                  <input style={estilos.input} name="notas" value={form.notas} onChange={handleChange} placeholder="Instrucciones para la entrega..." />
                </Campo>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          <div style={estilos.card}>
            <h2 style={estilos.cardTitulo}>Catálogo</h2>
            {productos.length === 0 && (
              <p style={estilos.vacio}>No hay productos disponibles.</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {productos.map((p) => {
                const enCarrito = items.find((i) => i.id_producto === p.id_producto)
                return (
                  <div key={p.id_producto} style={estilos.catalogoItem}>
                    {p.imagen_url && (
                      <img src={p.imagen_url} alt={p.nombre} style={estilos.catalogoImg} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={estilos.catalogoNombre}>{p.nombre}</p>
                      <p style={estilos.catalogoPrecio}>${Number(p.precio_unitario).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / u.</p>
                      <p style={{ fontSize: "0.72rem", color: p.stock_actual <= p.stock_critico ? "var(--rojo)" : "var(--text-hint)", marginTop: "0.1rem" }}>
                        Stock: {p.stock_actual} u.
                      </p>
                    </div>
                    <button
                      style={{ ...estilos.btnCatalogo, ...(enCarrito ? estilos.btnCatalogoActivo : {}) }}
                      onClick={() => {
                        if (enCarrito) return
                        setItems((prev) => [...prev, { id_producto: p.id_producto, cantidad: 1 }])
                      }}
                    >
                      {enCarrito ? "✓ Agregado" : "+ Agregar"}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={estilos.card}>
            <h2 style={estilos.cardTitulo}>Mi pedido</h2>

            {errores.items && <p style={estilos.error}>{errores.items}</p>}

            {items.length === 0 && (
              <p style={estilos.vacio}>Seleccioná productos del catálogo.</p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {items.map((item, idx) => {
                const producto = productos.find((p) => p.id_producto === item.id_producto)
                const subtotal = (producto?.precio_unitario || 0) * Number(item.cantidad)
                return (
                  <div key={idx} style={estilos.itemFila}>
                    {producto?.imagen_url && (
                      <img src={producto.imagen_url} alt={producto.nombre} style={estilos.itemImg} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "0.2rem" }}>
                        {producto?.nombre || "—"}
                      </p>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-hint)" }}>
                        ${Number(producto?.precio_unitario).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / u.
                      </p>
                    </div>
                    <input
                      style={estilos.inputCantidad}
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(e) => actualizarItem(idx, e.target.value)}
                    />
                    <span style={estilos.subtotal}>${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    <button style={estilos.botonQuitar} onClick={() => quitarItem(idx)}>✕</button>
                  </div>
                )
              })}
            </div>

            {items.length > 0 && (
              <div style={estilos.total}>
                <span>Total estimado</span>
                <span style={{ fontWeight: "800", fontSize: "1.15rem", color: "var(--verde-oscuro)" }}>
                  ${calcularTotal().toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {erroresStock.length > 0 && (
            <div style={estilos.alertaStock}>
              <p style={{ fontWeight: "700", marginBottom: "0.4rem" }}>Stock insuficiente</p>
              {erroresStock.map((err) => (
                <p key={err.nombre} style={{ fontSize: "0.82rem" }}>
                  <strong>{err.nombre}</strong>: solicitás {err.solicitado} u., disponibles {err.disponible} u.
                </p>
              ))}
            </div>
          )}

          <button
            style={{ ...estilos.botonPrimario, opacity: guardando ? 0.6 : 1 }}
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? "Procesando..." : "Confirmar pedido"}
          </button>
        </div>
      </div>
    </div>
  )
}

const estilos = {
  ...estilosComunes,
  encabezado: { marginBottom: "2rem" },
  botonVolver: { fontSize: "0.875rem", color: "var(--azul)", cursor: "pointer", fontWeight: "500" },
  grilla: { display: "grid", gridTemplateColumns: "1fr 380px", gap: "1rem", alignItems: "start" },
  card: { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-md)", padding: "1.25rem" },
  cardTitulo: { fontSize: "0.95rem", fontWeight: "600", color: "var(--text-primary)", marginBottom: "1rem" },
  formGrilla: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  input: { width: "100%", padding: "0.65rem 1rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)" },
  catalogoItem: { display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.6rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-surface-2)", border: "1px solid var(--border)" },
  catalogoImg: { width: "44px", height: "50px", objectFit: "contain", flexShrink: 0, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.12))" },
  catalogoNombre: { fontSize: "0.82rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.1rem" },
  catalogoPrecio: { fontSize: "0.75rem", color: "var(--text-secondary)" },
  btnCatalogo: { padding: "0.35rem 0.75rem", borderRadius: "var(--radius-md)", fontSize: "0.75rem", fontWeight: "700", cursor: "pointer", border: "1.5px solid var(--verde)", color: "var(--verde)", backgroundColor: "transparent", flexShrink: 0, whiteSpace: "nowrap" },
  btnCatalogoActivo: { backgroundColor: "var(--verde-claro)", color: "var(--verde-oscuro)", cursor: "default" },
  itemFila: { display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-surface-2)" },
  itemImg: { width: "36px", height: "42px", objectFit: "contain", flexShrink: 0, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.1))" },
  inputCantidad: { width: "60px", padding: "0.4rem 0.5rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.85rem", textAlign: "center", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)", flexShrink: 0 },
  subtotal: { fontSize: "0.85rem", fontWeight: "700", color: "var(--text-primary)", minWidth: "75px", textAlign: "right" },
  botonQuitar: { color: "var(--text-hint)", cursor: "pointer", fontSize: "0.8rem", padding: "0.25rem", flexShrink: 0 },
  vacio: { fontSize: "0.875rem", color: "var(--text-hint)", textAlign: "center", padding: "1rem 0" },
  total: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 0 0", marginTop: "0.75rem", borderTop: "2px solid var(--border)", color: "var(--text-primary)", fontSize: "0.9rem", fontWeight: "600" },
  alertaStock: { backgroundColor: "var(--rojo-claro)", border: "1px solid var(--rojo)", borderRadius: "var(--radius-md)", padding: "0.85rem 1rem", color: "var(--rojo)", lineHeight: 1.6 },
  botonPrimario: { width: "100%", padding: "0.85rem", backgroundColor: "var(--verde)", color: "white", borderRadius: "var(--radius-md)", fontWeight: "700", boxShadow: "var(--shadow-verde)", fontSize: "0.95rem", cursor: "pointer" },
}
