import { createContext, useContext, useState, useCallback } from "react"

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const cerrar = useCallback((id) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, cerrando: true } : t))
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 600)
  }, [])

  const showToast = useCallback((mensaje, tipo = "exito") => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, mensaje, tipo, cerrando: false }])
    setTimeout(() => cerrar(id), 4500)
  }, [cerrar])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={estilos.contenedor}>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onCerrar={() => cerrar(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

const CONFIG = {
  exito:       { bg: "var(--verde-claro)",   border: "var(--verde)",   color: "var(--verde-oscuro)", icono: "✓" },
  error:       { bg: "var(--rojo-claro)",    border: "var(--rojo)",    color: "var(--rojo-oscuro)",  icono: "✕" },
  advertencia: { bg: "var(--crema)",         border: "var(--naranja)", color: "var(--naranja-oscuro)", icono: "!" },
}

function Toast({ toast, onCerrar }) {
  const cfg = CONFIG[toast.tipo] || CONFIG.exito

  return (
    <div style={{
      ...estilos.toast,
      backgroundColor: cfg.bg,
      borderColor: cfg.border,
      animation: toast.cerrando
        ? "toastSlideOut 0.6s ease forwards"
        : "toastSlideIn 0.25s ease both",
    }}>
      <span style={{ ...estilos.icono, backgroundColor: cfg.border, color: "white" }}>
        {cfg.icono}
      </span>
      <p style={{ ...estilos.mensaje, color: cfg.color }}>{toast.mensaje}</p>
      <button onClick={onCerrar} style={{ ...estilos.cerrar, color: cfg.color }}>✕</button>
    </div>
  )
}

const estilos = {
  contenedor: {
    position: "fixed",
    top: "1.25rem",
    right: "1.25rem",
    zIndex: 9999,
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    maxWidth: "340px",
    width: "100%",
  },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.85rem 1rem",
    borderRadius: "var(--radius-lg)",
    border: "1.5px solid",
    boxShadow: "var(--shadow-lg)",
    animation: "toastSlideIn 0.25s ease both",
  },
  icono: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    fontWeight: "800",
    flexShrink: 0,
  },
  mensaje: {
    flex: 1,
    fontSize: "0.855rem",
    fontWeight: "600",
    lineHeight: 1.4,
  },
  cerrar: {
    fontSize: "0.85rem",
    cursor: "pointer",
    fontWeight: "700",
    flexShrink: 0,
    opacity: 0.7,
  },
}
