import { useEffect } from "react"

export default function Modal({ titulo, onCerrar, children, ancho }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "Escape") onCerrar()
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [onCerrar])

  return (
    <div style={estilos.overlay} onClick={onCerrar}>
      <div style={{ ...estilos.caja, maxWidth: ancho || "520px" }} onClick={(e) => e.stopPropagation()}>
        <div style={estilos.encabezado}>
          <h2 style={estilos.titulo}>{titulo}</h2>
          <button style={estilos.botonCerrar} onClick={onCerrar}>✕</button>
        </div>
        <div style={estilos.cuerpo}>
          {children}
        </div>
      </div>
    </div>
  )
}

const estilos = {
  overlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(10, 20, 12, 0.55)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    animation: "fadeIn 0.2s ease",
  },
  caja: {
    backgroundColor: "var(--bg-surface)",
    borderRadius: "var(--radius-xl)",
    width: "100%",
    maxWidth: "520px",
    boxShadow: "var(--shadow-xl)",
    border: "1px solid var(--border)",
    animation: "modalEntrada 0.28s cubic-bezier(0.34, 1.56, 0.64, 1) both",
  },
  encabezado: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.35rem 1.6rem",
    borderBottom: "1px solid var(--border)",
  },
  titulo: {
    fontSize: "1.05rem",
    fontWeight: "700",
    color: "var(--text-primary)",
    letterSpacing: "-0.2px",
  },
  botonCerrar: {
    width: "28px",
    height: "28px",
    borderRadius: "var(--radius-sm)",
    color: "var(--text-hint)",
    fontSize: "1rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "var(--bg-surface-2)",
    transition: "background-color var(--transition-fast), color var(--transition-fast)",
  },
  cuerpo: {
    padding: "1.6rem",
  },
}