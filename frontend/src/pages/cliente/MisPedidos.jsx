import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { SkeletonTabla } from "../../components/ui/Skeleton"
import { fetchAuth, API_URL } from "../../services/fetchAuth"
import { estilosComunes } from "../../styles/estilosComunes"
import { useCargarDatos } from "../../hooks/useCargarDatos"

const ESTADOS_PEDIDO = [
  "Pendiente", "Confirmado", "En preparación",
  "Despachado", "En tránsito", "En entrega", "Entregado", "Cancelado",
]

const COLORES_ESTADO = {
  "Pendiente": { bg: "var(--naranja-claro)", color: "var(--naranja)" },
  "Confirmado": { bg: "var(--azul-claro)", color: "var(--azul)" },
  "En preparación": { bg: "var(--azul-claro)", color: "var(--azul)" },
  "Despachado": { bg: "var(--verde-claro)", color: "var(--verde-oscuro)" },
  "En tránsito": { bg: "var(--verde-claro)", color: "var(--verde-oscuro)" },
  "En entrega": { bg: "var(--verde-claro)", color: "var(--verde-oscuro)" },
  "Entregado": { bg: "var(--verde-claro)", color: "var(--verde-oscuro)" },
  "Cancelado": { bg: "var(--rojo-claro)", color: "var(--rojo)" },
}

const PUEDE_CANCELAR = ["Pendiente", "Confirmado", "En preparación"]
const PUEDE_MODIFICAR = ["Pendiente"]

export default function MisPedidos() {
  const navigate = useNavigate()

  const { datos: [pedidos, productos], cargando, recargar: cargarPedidos } = useCargarDatos([
    `${API_URL}/pedidos/mis-pedidos`,
    `${API_URL}/productos`,
  ])
  const [filtroEstado, setFiltroEstado] = useState("Todos")

  const [modalCancelar, setModalCancelar] = useState(null)
  const [motivoCancelacion, setMotivoCancelacion] = useState("")
  const [cancelando, setCancelando] = useState(false)

  const [modalModificar, setModalModificar] = useState(null)
  const [formMod, setFormMod] = useState({})
  const [itemsMod, setItemsMod] = useState([])
  const [modificando, setModificando] = useState(false)

  const filtrados = pedidos.filter((p) =>
    filtroEstado === "Todos" || p.estado === filtroEstado
  )

  function abrirCancelar(p) {
    setModalCancelar(p)
    setMotivoCancelacion("")
  }

  async function confirmarCancelacion() {
    if (cancelando) return
    setCancelando(true)
    try {
      await fetchAuth(`${API_URL}/pedidos/${modalCancelar.id_pedido}/estado`, {
        method: "PATCH",
        body: JSON.stringify({ accion: "cancelar", observacion: motivoCancelacion || "Cancelado por el cliente" }),
      })
      setModalCancelar(null)
      await cargarPedidos()
    } finally {
      setCancelando(false)
    }
  }

  function abrirModificar(p) {
    setModalModificar(p)
    setFormMod({
      direccion_entrega: p.direccion_entrega,
      ciudad_entrega: p.ciudad_entrega,
      contacto_receptor: p.contacto_receptor,
      telefono_receptor: p.telefono_receptor || "",
      notas: p.notas || "",
    })
    setItemsMod(p.items.map((i) => ({ id_producto: i.id_producto, cantidad: i.cantidad })))
  }

  function actualizarItemMod(idx, cantidad) {
    setItemsMod((prev) => prev.map((item, i) =>
      i === idx ? { ...item, cantidad: Number(cantidad) } : item
    ))
  }

  async function confirmarModificacion() {
    if (modificando) return
    setModificando(true)
    try {
      await fetchAuth(`${API_URL}/pedidos/${modalModificar.id_pedido}`, {
        method: "PUT",
        body: JSON.stringify({ ...formMod, items: itemsMod }),
      })
      setModalModificar(null)
      await cargarPedidos()
    } finally {
      setModificando(false)
    }
  }

  if (cargando) return <div style={{ padding: "0" }}><SkeletonTabla filas={4} columnas={5} /></div>

  return (
    <div>
      <div style={estilos.encabezado}>
        <div>
          <h1 style={estilos.titulo}>Mis pedidos</h1>
          <p style={estilos.subtitulo}>Historial de tus pedidos</p>
        </div>
        <button style={estilos.botonPrimario} onClick={() => navigate("/cliente/nuevo-pedido")}>
          + Nuevo pedido
        </button>
      </div>

      <div style={estilos.filtrosEstado}>
        {["Todos", ...ESTADOS_PEDIDO].map((e) => (
          <button
            key={e}
            style={filtroEstado === e ? { ...estilos.filtro, ...estilos.filtroActivo } : estilos.filtro}
            onClick={() => setFiltroEstado(e)}
          >
            {e}
          </button>
        ))}
      </div>

      <div style={estilos.tabla}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={estilos.thead}>
              <th style={estilos.th}>Nro. pedido</th>
              <th style={estilos.th}>Fecha</th>
              <th style={estilos.th}>Ciudad</th>
              <th style={estilos.th}>Total</th>
              <th style={estilos.th}>Estado</th>
              <th style={estilos.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} style={estilos.vacio}>
                  {filtroEstado !== "Todos"
                    ? `No tenés pedidos con estado "${filtroEstado}".`
                    : "Aún no tenés pedidos. ¡Creá tu primero!"}
                </td>
              </tr>
            )}
            {filtrados.map((p) => {
              const colorEstado = COLORES_ESTADO[p.estado] || {}
              const puedeModificar = PUEDE_MODIFICAR.includes(p.estado)
              const puedeCancelar = PUEDE_CANCELAR.includes(p.estado)
              return (
                <tr key={p.id_pedido} style={estilos.fila}>
                  <td style={{ ...estilos.td, fontWeight: "600" }}>{p.nro_pedido}</td>
                  <td style={{ ...estilos.td, color: "var(--text-secondary)" }}>{p.fecha_pedido}</td>
                  <td style={estilos.td}>{p.ciudad_entrega}</td>
                  <td style={{ ...estilos.td, fontWeight: "600" }}>${Number(p.total).toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td style={estilos.td}>
                    <span style={{ ...estilos.badge, backgroundColor: colorEstado.bg, color: colorEstado.color }}>
                      {p.estado}
                    </span>
                  </td>
                  <td style={estilos.td}>
                    <button style={estilos.accion} onClick={() => navigate(`/cliente/seguimiento?id=${p.id_pedido}`)}>
                      Seguimiento
                    </button>
                    {puedeModificar && (
                      <button style={{ ...estilos.accion, color: "var(--verde-oscuro)" }} onClick={() => abrirModificar(p)}>
                        Modificar
                      </button>
                    )}
                    {puedeCancelar && (
                      <button style={{ ...estilos.accion, color: "var(--rojo)" }} onClick={() => abrirCancelar(p)}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modalCancelar && (
        <div style={estilos.overlay} onClick={() => setModalCancelar(null)}>
          <div style={estilos.modal} onClick={(e) => e.stopPropagation()}>
            <h2 style={estilos.modalTitulo}>Cancelar pedido {modalCancelar.nro_pedido}</h2>
            <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              Esta acción no se puede deshacer. El pedido pasará a estado <strong>Cancelado</strong>.
            </p>
            <label style={estilos.label}>Motivo (opcional)</label>
            <textarea
              style={estilos.textarea}
              rows={3}
              placeholder="Ej: cambio de planes, error en el pedido..."
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
            />
            <div style={estilos.modalAcciones}>
              <button style={estilos.botonSecundario} onClick={() => setModalCancelar(null)}>Volver</button>
              <button
                style={{ ...estilos.botonPeligro, opacity: cancelando ? 0.6 : 1 }}
                onClick={confirmarCancelacion}
                disabled={cancelando}
              >
                {cancelando ? "Cancelando..." : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalModificar && (
        <div style={estilos.overlay} onClick={() => setModalModificar(null)}>
          <div style={{ ...estilos.modal, maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={estilos.modalTitulo}>Modificar pedido {modalModificar.nro_pedido}</h2>
            <p style={{ fontSize: "0.8rem", color: "var(--text-hint)", marginBottom: "1.25rem" }}>
              Solo se pueden modificar pedidos en estado <strong>Pendiente</strong>.
            </p>

            <div style={estilos.formGrilla}>
              {[
                { name: "direccion_entrega", label: "Dirección" },
                { name: "ciudad_entrega", label: "Ciudad" },
                { name: "contacto_receptor", label: "Contacto receptor" },
                { name: "telefono_receptor", label: "Teléfono" },
              ].map(({ name, label }) => (
                <div key={name}>
                  <label style={estilos.label}>{label}</label>
                  <input
                    style={estilos.input}
                    value={formMod[name] || ""}
                    onChange={(e) => setFormMod((prev) => ({ ...prev, [name]: e.target.value }))}
                  />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={estilos.label}>Notas</label>
                <input
                  style={estilos.input}
                  value={formMod.notas || ""}
                  onChange={(e) => setFormMod((prev) => ({ ...prev, notas: e.target.value }))}
                />
              </div>
            </div>

            <p style={{ fontSize: "0.82rem", fontWeight: "700", color: "var(--text-primary)", margin: "1rem 0 0.5rem" }}>
              Cantidades
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
              {itemsMod.map((item, idx) => {
                const prod = productos.find((p) => p.id_producto === item.id_producto)
                return (
                  <div key={idx} style={estilos.itemModFila}>
                    {prod?.imagen_url && (
                      <img src={prod.imagen_url} alt={prod.nombre} style={{ width: "32px", height: "38px", objectFit: "contain" }} />
                    )}
                    <span style={{ flex: 1, fontSize: "0.85rem", fontWeight: "600" }}>
                      {prod?.nombre || modalModificar.items[idx]?.producto || "—"}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-hint)" }}>
                      Stock: {prod?.stock_actual ?? modalModificar.items[idx]?.stock_actual ?? "—"} u.
                    </span>
                    <input
                      type="number"
                      min="1"
                      style={estilos.inputCantidad}
                      value={item.cantidad}
                      onChange={(e) => actualizarItemMod(idx, e.target.value)}
                    />
                  </div>
                )
              })}
            </div>

            <div style={estilos.modalAcciones}>
              <button style={estilos.botonSecundario} onClick={() => setModalModificar(null)}>Cancelar</button>
              <button
                style={{ ...estilos.botonPrimario, opacity: modificando ? 0.6 : 1 }}
                onClick={confirmarModificacion}
                disabled={modificando}
              >
                {modificando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const estilos = {
  ...estilosComunes,
  encabezado: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  filtrosEstado: { display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" },
  filtro: { padding: "0.4rem 0.85rem", borderRadius: "var(--radius-md)", fontSize: "0.78rem", border: "1px solid var(--border)", color: "var(--text-secondary)", backgroundColor: "var(--bg-surface)", cursor: "pointer" },
  filtroActivo: { backgroundColor: "var(--verde-claro)", border: "1.5px solid var(--verde)", color: "var(--verde-oscuro)", fontWeight: "700" },
  vacio: { padding: "2.5rem", textAlign: "center", color: "var(--text-hint)", fontSize: "0.875rem" },
  badge: { display: "inline-block", padding: "0.25rem 0.7rem", borderRadius: "var(--radius-full)", fontSize: "0.75rem", fontWeight: "600" },
  accion: { fontSize: "0.8rem", color: "var(--azul)", cursor: "pointer", fontWeight: "600", marginRight: "0.85rem" },
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(10,20,12,0.50)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-xl)", padding: "1.75rem", width: "100%", maxWidth: "460px", boxShadow: "var(--shadow-xl)", border: "1px solid var(--border)" },
  modalTitulo: { fontSize: "1.05rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.75rem" },
  modalAcciones: { display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" },
  label: { display: "block", fontSize: "0.78rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.35rem" },
  input: { width: "100%", padding: "0.6rem 0.8rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)" },
  textarea: { width: "100%", padding: "0.6rem 0.8rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", color: "var(--text-primary)", backgroundColor: "var(--bg-surface)", resize: "vertical", fontFamily: "inherit", marginBottom: "1rem" },
  formGrilla: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "0.5rem" },
  itemModFila: { display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.75rem", backgroundColor: "var(--bg-surface-2)", borderRadius: "var(--radius-md)" },
  inputCantidad: { width: "64px", padding: "0.35rem 0.5rem", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: "0.875rem", textAlign: "center", color: "var(--text-primary)" },
  botonPrimario: { padding: "0.65rem 1.4rem", backgroundColor: "var(--verde)", color: "white", borderRadius: "var(--radius-md)", fontWeight: "700", boxShadow: "var(--shadow-verde)", fontSize: "0.875rem", cursor: "pointer" },
  botonSecundario: { padding: "0.65rem 1.4rem", backgroundColor: "var(--bg-surface)", color: "var(--text-secondary)", borderRadius: "var(--radius-md)", fontWeight: "600", fontSize: "0.875rem", cursor: "pointer", border: "1.5px solid var(--border)" },
  botonPeligro: { padding: "0.65rem 1.4rem", backgroundColor: "var(--rojo)", color: "white", borderRadius: "var(--radius-md)", fontWeight: "700", fontSize: "0.875rem", cursor: "pointer" },
}
