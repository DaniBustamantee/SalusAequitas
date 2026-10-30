import { Outlet, Navigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import Sidebar from "./Sidebar"

export default function Layout() {
  const { usuario } = useAuth()

  if (!usuario) return <Navigate to="/login" replace />

  return (
    <div style={estilos.contenedor}>
      <Sidebar />
      <main style={estilos.main}>
        <Outlet />
      </main>
    </div>
  )
}

const estilos = {
  contenedor: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "var(--bg-page)",
  },
  main: {
    flex: 1,
    padding: "2rem 2.5rem",
    overflowY: "auto",
    minHeight: "100vh",
    animation: "fadeIn 0.22s ease both",
  },
}
