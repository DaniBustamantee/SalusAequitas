import { NavLink, useNavigate } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { useTheme } from "../../context/ThemeContext"

const Ico = {
  dashboard: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>,
  clientes: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  transportistas: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>,
  productos: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>,
  zonas: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>,
  proveedores: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>,
  insumos: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" /></svg>,
  materiasPrimas: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>,
  pedidos: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>,
  envios: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
  produccion: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" /></svg>,
  reportes: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>,
  precios: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  lotes: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
  nuevoLote: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>,
  misPedidos: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>,
  nuevoPedido: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
  seguimiento: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>,
  ruta: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11" /></svg>,
  confirmar: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>,
}

const NAV_ADMIN = [
  { to: "/admin/dashboard", label: "Dashboard", icono: Ico.dashboard },
  { to: "/admin/clientes", label: "Clientes", icono: Ico.clientes },
  { to: "/admin/transportistas", label: "Transportistas", icono: Ico.transportistas },
  { to: "/admin/productos", label: "Productos", icono: Ico.productos },
  { to: "/admin/zonas", label: "Zonas", icono: Ico.zonas },
  { to: "/admin/proveedores", label: "Proveedores", icono: Ico.proveedores },
  { to: "/admin/materias-primas", label: "Materias Primas", icono: Ico.materiasPrimas },
  { to: "/admin/insumos", label: "Insumos", icono: Ico.insumos },
  { to: "/admin/pedidos", label: "Pedidos", icono: Ico.pedidos },
  { to: "/admin/envios", label: "Envíos", icono: Ico.envios },
  { to: "/admin/produccion", label: "Producción", icono: Ico.produccion },
  { to: "/admin/reportes", label: "Reportes", icono: Ico.reportes },
  { to: "/admin/actualizador-precios", label: "Actualiz. Precios", icono: Ico.precios },
]

const NAV_OPERARIO = [
  { to: "/operario/lotes", label: "Mis lotes", icono: Ico.lotes },
  { to: "/operario/nuevo-lote", label: "Nuevo lote", icono: Ico.nuevoLote },
]

const NAV_CLIENTE = [
  { to: "/cliente/mis-pedidos", label: "Mis pedidos", icono: Ico.misPedidos },
  { to: "/cliente/nuevo-pedido", label: "Nuevo pedido", icono: Ico.nuevoPedido },
  { to: "/cliente/seguimiento", label: "Seguimiento", icono: Ico.seguimiento },
]

const NAV_TRANSPORTISTA = [
  { to: "/transportista/ruta", label: "Ruta del día", icono: Ico.ruta },
  { to: "/transportista/entregas", label: "Confirmar entrega", icono: Ico.confirmar },
]

const NAV_POR_ROL = {
  "Administrador": NAV_ADMIN,
  "Cliente": NAV_CLIENTE,
  "Transportista": NAV_TRANSPORTISTA,
  "Operario de Producción": NAV_OPERARIO,
  "Operario de Produccion": NAV_OPERARIO,
}

const ETIQUETA_ROL = {
  "Administrador": "Administrador",
  "Cliente": "Cliente",
  "Transportista": "Transportista",
  "Operario de Producción": "Operario de Producción",
  "Operario de Produccion": "Operario de Producción",
}

const AVATAR_COLOR = {
  "Administrador": "#378ADD",
  "Cliente": "#EF9F27",
  "Transportista": "#1D9E75",
  "Operario de Producción": "#9B59B6",
  "Operario de Produccion": "#9B59B6",
}

export default function Sidebar() {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const { tema, toggleTema } = useTheme()
  const nav = NAV_POR_ROL[usuario?.rol] || NAV_ADMIN

  function handleLogout() {
    logout()
    navigate("/login")
  }

  const iniciales = usuario?.nombre
    ? usuario.nombre.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  const avatarColor = AVATAR_COLOR[usuario?.rol] || "#1D9E75"

  return (
    <aside style={estilos.sidebar}>

      <div style={estilos.logo}>
        <div style={estilos.logoIcono}>
          <img src="/images/logo-vitabiosa.svg" alt="Vitabiosa" style={estilos.logoImg} />
        </div>
        <div>
          <p style={estilos.logoNombre}>Salus Aequitas</p>
          <p style={estilos.logoSub}>Sistema logístico</p>
        </div>
      </div>

      <div style={estilos.separador} />

      <nav style={estilos.nav}>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="sidebar-nav-link"
            style={({ isActive }) => isActive ? { ...estilos.link, ...estilos.linkActivo } : estilos.link}
          >
            <span style={estilos.linkIcono}>{item.icono}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={estilos.pie}>
        <div style={{ ...estilos.usuario, cursor: "pointer" }} onClick={() => navigate("/perfil")}>
          <div style={{ ...estilos.avatar, backgroundColor: avatarColor }}>
            {iniciales}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={estilos.usuarioNombre}>{usuario?.nombre}</p>
            <p style={estilos.usuarioRol}>{ETIQUETA_ROL[usuario?.rol]}</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button onClick={toggleTema} style={estilos.botonTema} title={tema === "light" ? "Modo oscuro" : "Modo claro"}>
            {tema === "light" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
          <button onClick={handleLogout} style={{ ...estilos.botonLogout, flex: 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  )
}

const estilos = {
  sidebar: {
    width: "232px",
    background: "linear-gradient(180deg, #0A2E15 0%, #14532D 60%, #166534 100%)",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    padding: "1.25rem 0.75rem",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
    padding: "0.25rem 0.5rem",
    marginBottom: "0.25rem",
  },
  logoIcono: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    backgroundColor: "rgba(255,255,255,0.18)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    padding: "4px",
  },
  logoImg: {
    width: "28px",
    height: "28px",
    objectFit: "contain",
    filter: "brightness(0) invert(1)",
  },
  logoNombre: {
    color: "white",
    fontWeight: "700",
    fontSize: "0.875rem",
    lineHeight: 1.2,
  },
  logoSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: "0.7rem",
    marginTop: "0.1rem",
  },
  separador: {
    height: "1px",
    backgroundColor: "rgba(255,255,255,0.12)",
    margin: "0.75rem 0.5rem",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
    flex: 1,
    overflowY: "auto",
  },
  link: {
    display: "flex",
    alignItems: "center",
    gap: "0.65rem",
    padding: "0.55rem 0.75rem",
    borderRadius: "var(--radius-md)",
    color: "rgba(255,255,255,0.65)",
    textDecoration: "none",
    fontSize: "0.845rem",
    fontWeight: "400",
    transition: "background 0.15s, color 0.15s",
    borderLeft: "3px solid transparent",
  },
  linkActivo: {
    backgroundColor: "rgba(255,255,255,0.18)",
    color: "white",
    fontWeight: "600",
    borderLeft: "3px solid rgba(255,255,255,0.8)",
  },
  linkIcono: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    opacity: 0.85,
  },
  pie: {
    borderTop: "1px solid rgba(255,255,255,0.12)",
    paddingTop: "0.75rem",
    marginTop: "0.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
  },
  usuario: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.35rem 0.5rem",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.72rem",
    fontWeight: "700",
    color: "white",
    flexShrink: 0,
  },
  usuarioNombre: {
    color: "white",
    fontSize: "0.82rem",
    fontWeight: "600",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  usuarioRol: {
    color: "rgba(255,255,255,0.45)",
    fontSize: "0.7rem",
    marginTop: "0.05rem",
  },
  botonLogout: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "rgba(255,255,255,0.45)",
    fontSize: "0.78rem",
    cursor: "pointer",
    padding: "0.35rem 0.5rem",
    borderRadius: "var(--radius-md)",
    transition: "color 0.12s",
  },
  botonTema: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "30px",
    height: "30px",
    flexShrink: 0,
    color: "rgba(255,255,255,0.55)",
    borderRadius: "var(--radius-md)",
    backgroundColor: "rgba(255,255,255,0.08)",
    transition: "background 0.15s, color 0.15s",
    cursor: "pointer",
  },
}
