import { useAuth } from "../context/AuthContext"
import { useNavigate } from "react-router-dom"

const AVATAR_COLOR = {
  "Administrador": "#378ADD",
  "Cliente": "#EF9F27",
  "Transportista": "#1D9E75",
  "Operario de Producción": "#9B59B6",
  "Operario de Produccion": "#9B59B6",
}

export default function Perfil() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()

  if (!usuario) return null

  const iniciales = `${usuario.nombre?.[0] || ""}${usuario.apellido?.[0] || ""}`.toUpperCase()
  const color = AVATAR_COLOR[usuario.rol] || "#1D9E75"

  function handleLogout() {
    logout()
    navigate("/login")
  }

  return (
    <div style={estilos.wrapper}>
      <div style={estilos.card}>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem" }}>
          <div style={{ ...estilos.avatar, backgroundColor: color }}>
            {iniciales}
          </div>
          <h1 style={estilos.nombre}>{usuario.nombre} {usuario.apellido}</h1>
          <span style={{ ...estilos.badge, backgroundColor: color + "22", color }}>
            {usuario.rol}
          </span>
        </div>

        <div style={estilos.datosGrilla}>
          <Fila label="Nombre" valor={usuario.nombre} />
          <Fila label="Apellido" valor={usuario.apellido} />
          <Fila label="Email" valor={usuario.email} />
          <Fila label="Rol" valor={usuario.rol} />
        </div>

        <div style={estilos.separador} />

        <button style={estilos.botonCerrar} onClick={handleLogout}>
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}

function Fila({ label, valor }) {
  return (
    <div style={estilos.fila}>
      <p style={estilos.filaLabel}>{label}</p>
      <p style={estilos.filaValor}>{valor || "—"}</p>
    </div>
  )
}

const estilos = {
  wrapper: { display: "flex", justifyContent: "center", paddingTop: "2rem" },
  card: { backgroundColor: "var(--bg-surface)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-md)", padding: "2.5rem", width: "100%", maxWidth: "480px", border: "1px solid var(--border)" },
  avatar: { width: "80px", height: "80px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.75rem", fontWeight: "800", color: "white", marginBottom: "1rem", boxShadow: "0 4px 16px rgba(0,0,0,0.15)" },
  nombre: { fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "0.4rem" },
  badge: { display: "inline-block", padding: "0.25rem 0.9rem", borderRadius: "var(--radius-full)", fontSize: "0.8rem", fontWeight: "700" },
  datosGrilla: { display: "flex", flexDirection: "column", gap: "0" },
  fila: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.85rem 0", borderBottom: "1px solid var(--border)" },
  filaLabel: { fontSize: "0.82rem", color: "var(--text-hint)", fontWeight: "500" },
  filaValor: { fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "600" },
  separador: { marginTop: "1.5rem" },
  botonCerrar: { width: "100%", padding: "0.75rem", backgroundColor: "var(--rojo-claro)", color: "var(--rojo)", border: "1px solid var(--rojo)", borderRadius: "var(--radius-md)", fontWeight: "700", fontSize: "0.9rem", cursor: "pointer" },
}
