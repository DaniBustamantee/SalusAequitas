import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { estilosComunes } from "../../styles/estilosComunes"
import Campo from "../../components/ui/Campo"

const FORM_VACIO = {
  id_producto: "",
  fecha_elaboracion: new Date().toISOString().split("T")[0],
  fecha_vencimiento: "",
  cantidad_producida: "",
  observaciones: "",
}

export default function NuevoLote() {
  const navigate = useNavigate()

  const [productos, setProductos] = useState([])
  const [insumos, setInsumos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(FORM_VACIO)
  const [insumosUsados, setInsumosUsados] = useState([])
  const [errores, setErrores] = useState({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    async function cargar() {
      try {
        const [resP, resI] = await Promise.all([
          fetchAuth(`${API_URL}/productos`),
          fetchAuth(`${API_URL}/insumos?tipo=materia_prima`),
        ])
        const p = await resP.json()
        const i = await resI.json()
        setProductos(Array.isArray(p) ? p.filter(x => x.activo) : [])
        setInsumos(Array.isArray(i) ? i.filter(x => x.activo) : [])
      } catch {
        setProductos([])
        setInsumos([])
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

  function agregarInsumo() {
    setInsumosUsados((prev) => [...prev, { id_insumo: "", cantidad_usada: "" }])
  }

  function actualizarInsumo(idx, campo, valor) {
    setInsumosUsados((prev) =>
      prev.map((iu, i) =>
        i === idx ? { ...iu, [campo]: campo === "id_insumo" ? Number(valor) : valor } : iu
      )
    )
  }

  function quitarInsumo(idx) {
    setInsumosUsados((prev) => prev.filter((_, i) => i !== idx))
  }

  function validar() {
    const nuevosErrores = {}
    if (!form.id_producto) nuevosErrores.id_producto = "Seleccioná un producto"
    if (!form.fecha_elaboracion) nuevosErrores.fecha_elaboracion = "Campo obligatorio"
    if (!form.fecha_vencimiento) nuevosErrores.fecha_vencimiento = "Campo obligatorio"
    if (form.fecha_vencimiento && form.fecha_vencimiento <= form.fecha_elaboracion)
      nuevosErrores.fecha_vencimiento = "Debe ser posterior a la fecha de elaboración"
    if (!form.cantidad_producida || Number(form.cantidad_producida) <= 0)
      nuevosErrores.cantidad_producida = "Ingresá una cantidad válida"
    if (insumosUsados.some((iu) => !iu.id_insumo || !iu.cantidad_usada))
      nuevosErrores.insumos = "Completá todas las materias primas agregadas"
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

    try {
      const res = await fetchAuth(`${API_URL}/produccion`, {
        method: "POST",
        body: JSON.stringify({
          id_producto: Number(form.id_producto),
          fecha_elaboracion: form.fecha_elaboracion,
          fecha_vencimiento: form.fecha_vencimiento,
          cantidad_producida: Number(form.cantidad_producida),
          observaciones: form.observaciones,
          insumos: insumosUsados.map((iu) => ({
            id_insumo: Number(iu.id_insumo),
            cantidad_usada: Number(iu.cantidad_usada),
          })),
        }),
      })

      if (res.ok) {
        navigate("/operario/lotes")
      } else {
        const data = await res.json()
        if (data.detalle && data.detalle.length > 0) {

          const detalle = data.detalle
            .map((i) => `${i.nombre}: necesitás ${i.solicitado} ${i.unidad}, hay ${i.disponible}`)
            .join(" · ")
          setErrores({ insumos: `Stock insuficiente — ${detalle}` })
        } else {
          setErrores({ id_producto: data.error || "Error al guardar. Intentá de nuevo." })
        }
      }
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) return <p style={{ padding: "2rem", color: "var(--text-secondary)" }}>Cargando...</p>

  return (
    <div>
      <div style={estilos.encabezado}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button style={estilos.botonVolver} onClick={() => navigate("/operario/lotes")}>
            ← Volver
          </button>
          <div>
            <h1 style={estilos.titulo}>Nuevo lote</h1>
            <p style={estilos.subtitulo}>Registrá un lote de producción</p>
          </div>
        </div>
      </div>

      <div style={estilos.grilla}>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={estilos.card}>
            <h2 style={estilos.cardTitulo}>Datos del lote</h2>
            <div style={estilos.formGrilla}>

              <Campo label="Producto" error={errores.id_producto}>
                <select style={estilos.input} name="id_producto" value={form.id_producto} onChange={handleChange}>
                  <option value="">Seleccionar...</option>
                  {productos.map((p) => (
                    <option key={p.id_producto} value={p.id_producto}>{p.nombre}</option>
                  ))}
                </select>
              </Campo>

              <Campo label="Fecha de elaboración" error={errores.fecha_elaboracion}>
                <input style={estilos.input} type="date" name="fecha_elaboracion" value={form.fecha_elaboracion} onChange={handleChange} />
              </Campo>

              <Campo label="Fecha de vencimiento" error={errores.fecha_vencimiento}>
                <input style={estilos.input} type="date" name="fecha_vencimiento" value={form.fecha_vencimiento} onChange={handleChange} />
              </Campo>

              <Campo label="Cantidad producida (unidades)" error={errores.cantidad_producida}>
                <input style={estilos.input} type="number" min="1" name="cantidad_producida" value={form.cantidad_producida} onChange={handleChange} />
              </Campo>

              <div style={{ gridColumn: "1 / -1" }}>
                <Campo label="Observaciones">
                  <input style={estilos.input} name="observaciones" value={form.observaciones} onChange={handleChange} placeholder="Opcional..." />
                </Campo>
              </div>

            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={estilos.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={estilos.cardTitulo}>Materias primas utilizadas</h2>
              <button style={estilos.botonAgregar} onClick={agregarInsumo}>+ Agregar</button>
            </div>

            {errores.insumos && <p style={estilos.error}>{errores.insumos}</p>}

            {insumosUsados.length === 0 && (
              <p style={estilos.vacio}>No hay materias primas agregadas.</p>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {insumosUsados.map((iu, idx) => {
                const insumoSel = insumos.find((i) => i.id_insumo === iu.id_insumo)
                return (
                  <div key={idx} style={estilos.itemFila}>
                    <select
                      style={{ ...estilos.input, flex: 2 }}
                      value={iu.id_insumo}
                      onChange={(e) => actualizarInsumo(idx, "id_insumo", e.target.value)}
                    >
                      <option value="">Seleccionar...</option>
                      {insumos.map((i) => (
                        <option key={i.id_insumo} value={i.id_insumo}>
                          {i.nombre} (stock: {i.stock_actual} {i.unidad_medida})
                        </option>
                      ))}
                    </select>
                    <input
                      style={{ ...estilos.input, width: "80px" }}
                      type="number"
                      min="1"
                      placeholder="Cant."
                      value={iu.cantidad_usada}
                      onChange={(e) => actualizarInsumo(idx, "cantidad_usada", e.target.value)}
                    />
                    {insumoSel && <span style={estilos.unidad}>{insumoSel.unidad_medida}</span>}
                    <button style={estilos.botonQuitar} onClick={() => quitarInsumo(idx)}>✕</button>
                  </div>
                )
              })}
            </div>
          </div>

          <button
            style={{ ...estilos.botonPrimario, opacity: guardando ? 0.6 : 1 }}
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Registrar lote"}
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
  itemFila: { display: "flex", alignItems: "center", gap: "0.5rem" },
  unidad: { fontSize: "0.75rem", color: "var(--text-hint)", minWidth: "50px" },
  botonAgregar: { fontSize: "0.8rem", color: "var(--verde)", fontWeight: "600", cursor: "pointer", border: "1px solid var(--verde)", padding: "0.3rem 0.75rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--verde-claro)" },
  botonQuitar: { color: "var(--text-hint)", cursor: "pointer", fontSize: "0.8rem", padding: "0.25rem" },
  vacio: { fontSize: "0.875rem", color: "var(--text-hint)", textAlign: "center", padding: "1rem 0" },
  botonPrimario: { width: "100%", padding: "0.75rem", backgroundColor: "var(--verde)", color: "white", borderRadius: "var(--radius-md)", fontWeight: "700", boxShadow: "var(--shadow-verde)", fontSize: "0.95rem", cursor: "pointer" },
}
