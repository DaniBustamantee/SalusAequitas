import { createContext, useContext, useEffect, useState } from "react"

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(() => localStorage.getItem("tema") || "light")

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", tema)
    localStorage.setItem("tema", tema)
  }, [tema])

  function toggleTema() {
    setTema((prev) => (prev === "light" ? "dark" : "light"))
  }

  return (
    <ThemeContext.Provider value={{ tema, toggleTema }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
