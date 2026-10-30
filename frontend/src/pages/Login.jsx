import { useState } from "react"
import { useNavigate, Navigate, Link } from "react-router-dom"
import { useAuth, RUTAS_POR_ROL } from "../context/AuthContext"
import { API_URL } from "../services/fetchAuth"

export default function Login() {
  const { usuario, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: "", password: "" })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")
  const [verPass, setVerPass] = useState(false)

  if (usuario) return <Navigate to={RUTAS_POR_ROL[usuario.rol]} replace />

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError("")
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email.trim() || !form.password.trim()) {
      setError("Completá todos los campos.")
      return
    }
    setCargando(true)
    setError("")
    try {
      const respuesta = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      })
      const datos = await respuesta.json()
      if (!respuesta.ok) {
        setError(datos.error || "Error al iniciar sesión.")
        return
      }
      login(datos.usuario, datos.token)
      navigate(RUTAS_POR_ROL[datos.usuario.rol])
    } catch {
      setError("No se pudo conectar con el servidor.")
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={estilos.pagina}>

      <div style={estilos.panelMarca}>

        <div style={estilos.textura} />

        <div style={estilos.deco1} />
        <div style={estilos.deco2} />
        <div style={estilos.deco3} />
        <div style={estilos.deco4} />

        <div style={estilos.marcaContenido}>

          <div style={estilos.logoWrap}>
            <img src="/images/logo-vitabiosa.svg" alt="Vitabiosa" style={estilos.logoImg} />
          </div>

          <h1 style={estilos.marcaNombre}>Salus Aequitas</h1>
          <p style={estilos.marcaSub}>Sistema logístico · Vitabiosa S.A.</p>

          <div style={estilos.divisor} />

          <p style={estilos.marcaTagline}>
            Gestión integral de pedidos, producción y distribución de probióticos
          </p>

          <div style={estilos.features}>
            {[
              "Gestión de pedidos y envíos en tiempo real",
              "Control de producción y stock automatizado",
              "Panel multirol: admin, cliente, operario y transportista",
              "Reportes y métricas de la cadena logística",
            ].map((f) => (
              <div key={f} style={estilos.featureItem}>
                <div style={estilos.featureCheck}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6 L5 9 L10 3" stroke="#14532D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <span style={estilos.featureTexto}>{f}</span>
              </div>
            ))}
          </div>

          <div style={estilos.productosWrap}>
            {[
              { src: "/images/vitabiosa-natural.png", label: "Natural" },
              { src: "/images/vitabiosa-naranja.png", label: "Naranja" },
              { src: "/images/vitabiosa-frutilla.png", label: "Frutilla" },
            ].map((prod) => (
              <div key={prod.label} style={estilos.productoItem}>
                <img src={prod.src} alt={prod.label} style={estilos.productoImg} />
                <span style={estilos.productoLabel}>{prod.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={estilos.panelForm}>
        <div style={estilos.card} className="fade-in">

          <div style={estilos.accentBar} />

          <div style={estilos.cardEncabezado}>
            <div style={estilos.logoSmall}>
              <img src="/images/logo-vitabiosa.svg" alt="" style={{ height: "22px", filter: "invert(40%) sepia(80%) saturate(500%) hue-rotate(100deg)" }} />
            </div>
            <h2 style={estilos.formTitulo}>Bienvenido</h2>
            <p style={estilos.formSub}>Ingresá tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} style={estilos.form}>

            <div style={estilos.campo}>
              <label style={estilos.label}>Correo electrónico</label>
              <div style={estilos.inputWrap}>
                <svg style={estilos.inputIcono} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  style={estilos.input}
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  autoFocus
                />
              </div>
            </div>

            <div style={estilos.campo}>
              <label style={estilos.label}>Contraseña</label>
              <div style={estilos.inputWrap}>
                <svg style={estilos.inputIcono} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  style={estilos.input}
                  name="password"
                  type={verPass ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setVerPass(!verPass)} style={estilos.verPassBtn}>
                  {verPass ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div style={estilos.errorBox}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" style={{ ...estilos.boton, opacity: cargando ? 0.75 : 1 }} disabled={cargando}>
              {cargando ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                  <span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                  Ingresando...
                </span>
              ) : "Ingresar al sistema"}
            </button>
          </form>

          <p style={estilos.registroLink}>
            ¿Sos cliente nuevo?{" "}
            <Link to="/registro" style={{ color: "var(--verde-oscuro)", fontWeight: "700", textDecoration: "none" }}>
              Registrate aquí
            </Link>
          </p>

          <p style={estilos.formPie}>
            Vitabiosa · Bebida probiótica natural · © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}

const estilos = {
  pagina: {
    display: "flex",
    minHeight: "100vh",
  },

  panelMarca: {
    flex: "0 0 55%",
    background: "linear-gradient(160deg, #0A2E15 0%, #14532D 55%, #1A6B3A 100%)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    padding: "3rem 3.5rem",
  },
  textura: {
    position: "absolute", inset: 0,
    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
    backgroundSize: "24px 24px",
    pointerEvents: "none",
  },
  deco1: {
    position: "absolute", bottom: "-100px", right: "-100px",
    width: "450px", height: "450px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)",
  },
  deco2: {
    position: "absolute", top: "-80px", right: "40px",
    width: "300px", height: "300px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
  },
  deco3: {
    position: "absolute", top: "45%", left: "-60px",
    width: "200px", height: "200px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
  },
  deco4: {
    position: "absolute", bottom: "10%", left: "30%",
    width: "120px", height: "120px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
  },
  marcaContenido: {
    position: "relative", zIndex: 1, maxWidth: "460px",
  },
  logoWrap: { marginBottom: "1.5rem" },
  logoImg: { height: "46px", width: "auto", filter: "brightness(0) invert(1)", opacity: 0.92 },
  marcaNombre: {
    fontSize: "2.2rem", fontWeight: "800", color: "white",
    letterSpacing: "-0.5px", lineHeight: 1.1,
  },
  marcaSub: {
    fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", marginTop: "0.3rem",
    letterSpacing: "1px", textTransform: "uppercase",
  },
  divisor: {
    width: "48px", height: "3px",
    background: "linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.1))",
    borderRadius: "2px", margin: "1.75rem 0",
  },
  marcaTagline: {
    fontSize: "1rem", color: "rgba(255,255,255,0.82)",
    lineHeight: 1.65, marginBottom: "1.75rem", fontWeight: "400",
  },
  features: { display: "flex", flexDirection: "column", gap: "0.85rem" },
  featureItem: { display: "flex", alignItems: "flex-start", gap: "0.75rem" },
  featureCheck: {
    width: "20px", height: "20px", borderRadius: "50%",
    backgroundColor: "rgba(255,255,255,0.92)",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, marginTop: "1px",
    boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
  },
  featureTexto: { fontSize: "0.88rem", color: "rgba(255,255,255,0.78)", lineHeight: 1.5 },
  productosWrap: {
    display: "flex", gap: "1.25rem", marginTop: "2.5rem", alignItems: "flex-end",
  },
  productoItem: { display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem" },
  productoImg: {
    height: "100px", width: "auto", objectFit: "contain",
    filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.4))",
    transition: "transform 0.3s ease",
  },
  productoLabel: {
    fontSize: "0.7rem", color: "rgba(255,255,255,0.5)",
    fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px",
  },

  panelForm: {
    flex: 1,
    backgroundColor: "var(--bg-page)",
    backgroundImage: "radial-gradient(circle, rgba(21,163,90,0.05) 1px, transparent 1px)",
    backgroundSize: "28px 28px",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "2rem",
  },
  card: {
    backgroundColor: "var(--bg-surface)",
    borderRadius: "var(--radius-xl)",
    width: "100%", maxWidth: "390px",
    boxShadow: "var(--shadow-xl)",
    border: "1px solid var(--border)",
    overflow: "hidden",
  },
  accentBar: {
    height: "4px",
    background: "linear-gradient(90deg, #15A35A, #22C55E, #4ADE80)",
  },
  cardEncabezado: { padding: "2rem 2.25rem 1.5rem", },
  logoSmall: { marginBottom: "1rem" },
  formTitulo: {
    fontSize: "1.6rem", fontWeight: "800",
    color: "var(--text-primary)", letterSpacing: "-0.3px",
  },
  formSub: {
    fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.3rem",
  },
  form: {
    display: "flex", flexDirection: "column", gap: "1.1rem",
    padding: "0 2.25rem 1.5rem",
  },
  campo: { display: "flex", flexDirection: "column", gap: "0.4rem" },
  label: { fontSize: "0.82rem", fontWeight: "600", color: "var(--text-secondary)" },
  inputWrap: {
    position: "relative", display: "flex", alignItems: "center",
  },
  inputIcono: {
    position: "absolute", left: "0.85rem",
    color: "var(--text-hint)", pointerEvents: "none", flexShrink: 0,
  },
  input: {
    width: "100%",
    padding: "0.72rem 2.75rem 0.72rem 2.75rem",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-md)",
    fontSize: "0.9rem",
    color: "var(--text-primary)",
    backgroundColor: "var(--bg-surface-2)",
    outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  verPassBtn: {
    position: "absolute", right: "0.85rem",
    color: "var(--text-hint)", cursor: "pointer",
    display: "flex", alignItems: "center",
    transition: "color 0.15s",
  },
  errorBox: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    padding: "0.65rem 0.85rem",
    backgroundColor: "var(--rojo-claro)",
    border: "1px solid var(--rojo)",
    borderRadius: "var(--radius-md)",
    fontSize: "0.82rem", color: "var(--rojo)", fontWeight: "500",
  },
  boton: {
    padding: "0.8rem",
    background: "linear-gradient(135deg, #15A35A 0%, #12924F 100%)",
    color: "white",
    borderRadius: "var(--radius-md)",
    fontWeight: "700", fontSize: "0.9rem", cursor: "pointer",
    letterSpacing: "0.2px",
    boxShadow: "0 4px 14px rgba(21,163,90,0.35)",
    transition: "opacity 0.15s, box-shadow 0.15s",
    marginTop: "0.25rem",
  },
  registroLink: {
    textAlign: "center",
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    padding: "0.9rem 2.25rem 0",
  },
  formPie: {
    padding: "0.9rem 2.25rem 1.25rem",
    textAlign: "center", fontSize: "0.72rem",
    color: "var(--text-hint)",
    borderTop: "1px solid var(--border)",
    marginTop: "0.9rem",
  },
}
