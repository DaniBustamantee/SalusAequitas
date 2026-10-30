import { useState, useEffect } from "react"
import { Link, Navigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { API_URL } from "../services/fetchAuth"
import { formatearCuit, validarCuitDigito } from "../utils/cuit"

export default function Registro() {
  const { usuario } = useAuth()
  const [form, setForm] = useState({
    nombre: "", apellido: "", email: "", password: "",
    razon_social: "", cuit: "", telefono: "", ciudad: "", direccion: "", provincia: "",
  })
  const [errores, setErrores] = useState({})
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")
  const [exito, setExito] = useState(false)
  const [verPass, setVerPass] = useState(false)
  const [provincias, setProvincias] = useState([])
  const [ciudades, setCiudades] = useState([])

  useEffect(() => {
    fetch('https://apis.datos.gob.ar/georef/api/provincias?campos=id,nombre&max=24&orden=nombre')
      .then(r => r.json())
      .then(data => setProvincias(data.provincias))
  }, [])

  // Si ya está logueado, redirigir
  if (usuario) return <Navigate to="/login" replace />

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    if (errores[e.target.name]) setErrores((prev) => ({ ...prev, [e.target.name]: "" }))
    if (error) setError("")
  }

  async function handleProvinciaChange(nombreProvincia) {
    setForm(prev => ({ ...prev, provincia: nombreProvincia, ciudad: "" }))
    setCiudades([])
    if (errores.provincia) setErrores(prev => ({ ...prev, provincia: "" }))
    if (!nombreProvincia) return

    const res = await fetch(
      `https://apis.datos.gob.ar/georef/api/localidades?provincia=${encodeURIComponent(nombreProvincia)}&campos=id,nombre&max=500&orden=nombre`
    )
    const data = await res.json()
    setCiudades(data.localidades)
  }

  function validar() {
    const nuevosErrores = {}
    if (!form.nombre.trim()) nuevosErrores.nombre = "Campo obligatorio"
    if (!form.apellido.trim()) nuevosErrores.apellido = "Campo obligatorio"
    if (!form.email.trim()) nuevosErrores.email = "Campo obligatorio"
    else if (!/\S+@\S+\.\S+/.test(form.email)) nuevosErrores.email = "Email inválido"
    if (!form.password) nuevosErrores.password = "Campo obligatorio"
    else if (form.password.length < 6) nuevosErrores.password = "Mínimo 6 caracteres"
    if (!form.razon_social.trim()) nuevosErrores.razon_social = "Campo obligatorio"
    if (!form.cuit.trim()) nuevosErrores.cuit = "Campo obligatorio"
    else if (!/^\d{2}-\d{8}-\d{1}$/.test(form.cuit)) nuevosErrores.cuit = "Formato inválido (XX-XXXXXXXX-X)"
    else if (!validarCuitDigito(form.cuit)) nuevosErrores.cuit = "CUIL/CUIT inválido"
    if (form.telefono && !/^[\d\s\-()+]{8,15}$/.test(form.telefono)) nuevosErrores.telefono = "Teléfono inválido"
    if (!form.provincia) nuevosErrores.provincia = "Campo obligatorio"
    if (!form.ciudad) nuevosErrores.ciudad = "Campo obligatorio"
    return nuevosErrores
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validar()
    if (Object.keys(err).length > 0) { setErrores(err); return }

    setCargando(true)
    setError("")
    try {
      const res = await fetch(`${API_URL}/auth/registro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const datos = await res.json()
      if (!res.ok) {
        setError(datos.error || "Error al registrar la cuenta.")
        return
      }
      setExito(true)
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

        <div style={estilos.marcaContenido}>
          <div style={estilos.logoWrap}>
            <img src="/images/logo-vitabiosa.svg" alt="Vitabiosa" style={estilos.logoImg} />
          </div>

          <h1 style={estilos.marcaNombre}>Salus Aequitas</h1>
          <p style={estilos.marcaSub}>Sistema logístico · Vitabiosa S.A.</p>

          <div style={estilos.divisor} />

          <p style={estilos.marcaTagline}>
            Creá tu cuenta como cliente y accedé a nuestro portal para gestionar tus pedidos.
          </p>

          <div style={estilos.pasos}>
            {[
              { n: "1", texto: "Completá el formulario con tus datos" },
              { n: "2", texto: "El administrador activará tu cuenta" },
              { n: "3", texto: "Iniciá sesión y realizá tus pedidos" },
            ].map((p) => (
              <div key={p.n} style={estilos.pasoItem}>
                <div style={estilos.pasoBadge}>{p.n}</div>
                <span style={estilos.pasoTexto}>{p.texto}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={estilos.panelForm}>
        <div style={estilos.card} className="fade-in">

          <div style={estilos.accentBar} />

          {exito ? (

            <div style={estilos.exitoWrap}>
              <div style={estilos.exitoIcono}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 style={estilos.exitoTitulo}>¡Cuenta creada!</h2>
              <p style={estilos.exitoTexto}>
                Tu solicitud fue enviada al administrador. Una vez aprobada vas a poder ingresar al sistema con tu email y contraseña.
              </p>
              <Link to="/login" style={estilos.botonExito}>
                Ir al inicio de sesión
              </Link>
            </div>
          ) : (

            <>
              <div style={estilos.cardEncabezado}>
                <h2 style={estilos.formTitulo}>Crear cuenta</h2>
                <p style={estilos.formSub}>Completá tus datos para registrarte como cliente</p>
              </div>

              <form onSubmit={handleSubmit} style={estilos.form}>

                <div style={estilos.grilla}>
                  <Campo label="Nombre *" error={errores.nombre}>
                    <input style={estilos.input} name="nombre" value={form.nombre} onChange={handleChange} placeholder="Juan" />
                  </Campo>
                  <Campo label="Apellido *" error={errores.apellido}>
                    <input style={estilos.input} name="apellido" value={form.apellido} onChange={handleChange} placeholder="García" />
                  </Campo>
                </div>

                <div style={estilos.grilla}>
                  <Campo label="Correo electrónico *" error={errores.email}>
                    <input style={estilos.input} name="email" type="email" value={form.email} onChange={handleChange} placeholder="tu@email.com" />
                  </Campo>
                  <Campo label="Contraseña *" error={errores.password}>
                    <div style={{ position: "relative" }}>
                      <input
                        style={{ ...estilos.input, paddingRight: "2.5rem" }}
                        name="password"
                        type={verPass ? "text" : "password"}
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Mínimo 6 caracteres"
                      />
                      <button
                        type="button"
                        onClick={() => setVerPass(!verPass)}
                        style={estilos.verPassBtn}
                      >
                        {verPass ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </Campo>
                </div>

                <div style={estilos.separador}>
                  <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border)" }} />
                  <span>Datos de la empresa</span>
                  <div style={{ flex: 1, height: "1px", backgroundColor: "var(--border)" }} />
                </div>

                <div style={estilos.grilla}>
                  <Campo label="Razón social *" error={errores.razon_social}>
                    <input style={estilos.input} name="razon_social" value={form.razon_social} onChange={handleChange} placeholder="Mi Empresa S.R.L." />
                  </Campo>
                  <Campo label="CUIL / CUIT *" error={errores.cuit}>
                    <input
                      style={estilos.input}
                      name="cuit"
                      value={form.cuit}
                      onChange={(e) => {
                        const solo = e.target.value.replace(/\D/g, '').slice(0, 11)
                        setForm(prev => ({ ...prev, cuit: solo }))
                        if (errores.cuit) setErrores(prev => ({ ...prev, cuit: "" }))
                        if (error) setError("")
                      }}
                      onBlur={() => {
                        setForm(prev => ({ ...prev, cuit: formatearCuit(prev.cuit) }))
                      }}
                      placeholder="XX-XXXXXXXX-X"
                      maxLength={13}
                    />
                  </Campo>
                </div>

                <Campo label="Teléfono" error={errores.telefono}>
                  <input style={estilos.input} name="telefono" value={form.telefono} onChange={handleChange} placeholder="351-4567890" />
                </Campo>

                <div style={estilos.grilla}>
                  <Campo label="Provincia *" error={errores.provincia}>
                    <select
                      style={estilos.input}
                      value={form.provincia}
                      onChange={(e) => handleProvinciaChange(e.target.value)}
                    >
                      <option value="">Seleccioná una provincia</option>
                      {provincias.map(p => (
                        <option key={p.id} value={p.nombre}>{p.nombre}</option>
                      ))}
                    </select>
                  </Campo>
                  <Campo label="Ciudad *" error={errores.ciudad}>
                    <select
                      style={estilos.input}
                      value={form.ciudad}
                      onChange={(e) => {
                        setForm(prev => ({ ...prev, ciudad: e.target.value }))
                        if (errores.ciudad) setErrores(prev => ({ ...prev, ciudad: "" }))
                      }}
                      disabled={!form.provincia}
                    >
                      <option value="">{form.provincia ? "Seleccioná una ciudad" : "Primero elegí provincia"}</option>
                      {ciudades.map(c => (
                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                      ))}
                    </select>
                  </Campo>
                </div>

                <Campo label="Dirección">
                  <input style={estilos.input} name="direccion" value={form.direccion} onChange={handleChange} placeholder="Av. Colón 1234, piso 2" />
                </Campo>

                {error && (
                  <div style={estilos.errorBox}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  style={{ ...estilos.boton, opacity: cargando ? 0.75 : 1 }}
                  disabled={cargando}
                >
                  {cargando ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
                      <span style={{ width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                      Creando cuenta...
                    </span>
                  ) : "Crear cuenta"}
                </button>
              </form>

              <p style={estilos.loginLink}>
                ¿Ya tenés cuenta?{" "}
                <Link to="/login" style={{ color: "var(--verde-oscuro)", fontWeight: "700", textDecoration: "none" }}>
                  Iniciá sesión
                </Link>
              </p>

              <p style={estilos.formPie}>
                Vitabiosa · Bebida probiótica natural · © {new Date().getFullYear()}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Campo({ label, error, children }) {
  return (
    <div>
      <label style={estilos.label}>{label}</label>
      {children}
      {error && <p style={estilos.errorCampo}>{error}</p>}
    </div>
  )
}

const estilos = {
  pagina: { display: "flex", minHeight: "100vh" },

  panelMarca: {
    flex: "0 0 42%",
    background: "linear-gradient(160deg, #0A2E15 0%, #14532D 55%, #1A6B3A 100%)",
    position: "relative", overflow: "hidden",
    display: "flex", flexDirection: "column", justifyContent: "center",
    padding: "3rem 3rem",
  },
  textura: {
    position: "absolute", inset: 0,
    backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
    backgroundSize: "24px 24px", pointerEvents: "none",
  },
  deco1: {
    position: "absolute", bottom: "-100px", right: "-80px",
    width: "380px", height: "380px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)",
  },
  deco2: {
    position: "absolute", top: "-60px", right: "20px",
    width: "260px", height: "260px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)",
  },
  deco3: {
    position: "absolute", top: "50%", left: "-50px",
    width: "180px", height: "180px", borderRadius: "50%",
    background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)",
  },
  marcaContenido: { position: "relative", zIndex: 1, maxWidth: "400px" },
  logoWrap: { marginBottom: "1.5rem" },
  logoImg: { height: "42px", width: "auto", filter: "brightness(0) invert(1)", opacity: 0.92 },
  marcaNombre: { fontSize: "2rem", fontWeight: "800", color: "white", letterSpacing: "-0.5px" },
  marcaSub: { fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginTop: "0.3rem", letterSpacing: "1px", textTransform: "uppercase" },
  divisor: {
    width: "48px", height: "3px",
    background: "linear-gradient(90deg, rgba(255,255,255,0.5), rgba(255,255,255,0.1))",
    borderRadius: "2px", margin: "1.75rem 0",
  },
  marcaTagline: { fontSize: "0.95rem", color: "rgba(255,255,255,0.82)", lineHeight: 1.65, marginBottom: "2rem", fontWeight: "400" },
  pasos: { display: "flex", flexDirection: "column", gap: "1rem" },
  pasoItem: { display: "flex", alignItems: "center", gap: "0.85rem" },
  pasoBadge: {
    width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
    backgroundColor: "rgba(255,255,255,0.18)", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "0.8rem", fontWeight: "700",
  },
  pasoTexto: { fontSize: "0.875rem", color: "rgba(255,255,255,0.78)" },

  panelForm: {
    flex: 1,
    backgroundColor: "var(--bg-page)",
    backgroundImage: "radial-gradient(circle, rgba(21,163,90,0.05) 1px, transparent 1px)",
    backgroundSize: "28px 28px",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "2rem",
    overflowY: "auto",
  },
  card: {
    backgroundColor: "var(--bg-surface)",
    borderRadius: "var(--radius-xl)",
    width: "100%", maxWidth: "560px",
    boxShadow: "var(--shadow-xl)",
    border: "1px solid var(--border)",
    overflow: "hidden",
  },
  accentBar: { height: "4px", background: "linear-gradient(90deg, #15A35A, #22C55E, #4ADE80)" },
  cardEncabezado: { padding: "1.75rem 2rem 1.25rem" },
  formTitulo: { fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.3px" },
  formSub: { fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "0.3rem" },
  form: { display: "flex", flexDirection: "column", gap: "0.9rem", padding: "0 2rem 1rem" },
  grilla: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" },
  separador: {
    display: "flex", alignItems: "center", gap: "0.75rem",
    fontSize: "0.75rem", fontWeight: "700", color: "var(--text-hint)",
    textTransform: "uppercase", letterSpacing: "0.5px",
  },
  label: { display: "block", fontSize: "0.78rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.3rem" },
  input: {
    width: "100%",
    padding: "0.62rem 0.85rem",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-md)",
    fontSize: "0.875rem",
    color: "var(--text-primary)",
    backgroundColor: "var(--bg-surface-2)",
    boxSizing: "border-box",
  },
  verPassBtn: {
    position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)",
    color: "var(--text-hint)", cursor: "pointer", display: "flex", alignItems: "center",
  },
  errorCampo: { fontSize: "0.72rem", color: "var(--rojo)", marginTop: "0.25rem" },
  errorBox: {
    display: "flex", alignItems: "center", gap: "0.5rem",
    padding: "0.65rem 0.85rem",
    backgroundColor: "var(--rojo-claro)", border: "1px solid var(--rojo)",
    borderRadius: "var(--radius-md)", fontSize: "0.82rem", color: "var(--rojo)", fontWeight: "500",
  },
  boton: {
    padding: "0.8rem",
    background: "linear-gradient(135deg, #15A35A 0%, #12924F 100%)",
    color: "white", borderRadius: "var(--radius-md)",
    fontWeight: "700", fontSize: "0.9rem", cursor: "pointer",
    boxShadow: "0 4px 14px rgba(21,163,90,0.35)",
    transition: "opacity 0.15s",
    marginTop: "0.15rem",
  },
  loginLink: { textAlign: "center", fontSize: "0.82rem", color: "var(--text-secondary)", padding: "0.5rem 2rem 0" },
  formPie: { padding: "0.9rem 2rem 1.25rem", textAlign: "center", fontSize: "0.72rem", color: "var(--text-hint)", borderTop: "1px solid var(--border)", marginTop: "0.75rem" },

  exitoWrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "1rem", padding: "2.5rem 2rem 2rem", textAlign: "center",
  },
  exitoIcono: {
    width: "64px", height: "64px", borderRadius: "50%",
    backgroundColor: "var(--verde-claro)", color: "var(--verde-oscuro)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 16px rgba(21,163,90,0.25)",
  },
  exitoTitulo: { fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.3px" },
  exitoTexto: { fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.65, maxWidth: "340px" },
  botonExito: {
    display: "inline-block",
    padding: "0.75rem 2rem",
    background: "linear-gradient(135deg, #15A35A 0%, #12924F 100%)",
    color: "white", borderRadius: "var(--radius-md)",
    fontWeight: "700", fontSize: "0.9rem", textDecoration: "none",
    boxShadow: "0 4px 14px rgba(21,163,90,0.35)",
    marginTop: "0.5rem",
  },
}
