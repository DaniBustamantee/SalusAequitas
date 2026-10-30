import { createContext, useContext, useState } from "react"

const AuthContext = createContext(null)

export const RUTAS_POR_ROL = {
  "Administrador":          "/admin/dashboard",
  "Cliente":                "/cliente/mis-pedidos",
  "Transportista":          "/transportista/ruta",
  "Operario de Producción": "/operario/lotes",
  "Operario de Produccion": "/operario/lotes",
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const guardado = localStorage.getItem("sae_usuario")
      return guardado ? JSON.parse(guardado) : null
    } catch {
      return null
    }
  })

  function login(datos, token) {
    localStorage.setItem("sae_usuario", JSON.stringify(datos))
    localStorage.setItem("sae_token", token)
    setUsuario(datos)
  }

  function logout() {
    localStorage.removeItem("sae_usuario")
    localStorage.removeItem("sae_token")
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}