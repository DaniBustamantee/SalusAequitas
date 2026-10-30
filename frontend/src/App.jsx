import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { ThemeProvider } from "./context/ThemeContext"
import { ToastProvider } from "./context/ToastContext"
import Layout from "./components/layout/Layout"
import Login from "./pages/Login"
import Dashboard from "./pages/admin/Dashboard"
import Clientes from "./pages/admin/Clientes"
import Transportistas from "./pages/admin/Transportistas"
import Zonas from "./pages/admin/Zonas"
import Productos from "./pages/admin/Productos"
import Proveedores from "./pages/admin/Proveedores"
import Insumos from "./pages/admin/Insumos"
import MateriasPrimas from "./pages/admin/MateriasPrimas"
import Pedidos from "./pages/admin/Pedidos"
import PedidoDetalle from "./pages/admin/PedidoDetalle"
import NuevoPedido from "./pages/cliente/NuevoPedido"
import MisPedidos from "./pages/cliente/MisPedidos"
import Seguimiento from "./pages/cliente/Seguimiento"
import Envios from "./pages/admin/Envios"
import RutaDia from "./pages/transportista/RutaDia"
import ConfirmarEntrega from "./pages/transportista/ConfirmarEntrega"
import Produccion from "./pages/admin/Produccion"
import Reportes from "./pages/admin/Reportes"
import ActualizadorPrecios from "./pages/admin/ActualizadorPrecios"
import MisLotes from "./pages/operario/MisLotes"
import NuevoLote from "./pages/operario/NuevoLote"
import Registro from "./pages/Registro"
import Perfil from "./pages/Perfil"

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} />

              <Route element={<Layout />}>
                <Route path="/admin/dashboard" element={<Dashboard />} />
                <Route path="/admin/clientes" element={<Clientes />} />
                <Route path="/admin/transportistas" element={<Transportistas />} />
                <Route path="/admin/productos" element={<Productos />} />
                <Route path="/admin/zonas" element={<Zonas />} />
                <Route path="/admin/proveedores" element={<Proveedores />} />
                <Route path="/admin/insumos" element={<Insumos />} />
                <Route path="/admin/materias-primas" element={<MateriasPrimas />} />
                <Route path="/admin/pedidos" element={<Pedidos />} />
                <Route path="/admin/pedidos/:id" element={<PedidoDetalle />} />
                <Route path="/admin/envios" element={<Envios />} />
                <Route path="/admin/produccion" element={<Produccion />} />
                <Route path="/admin/reportes" element={<Reportes />} />
                <Route path="/admin/actualizador-precios" element={<ActualizadorPrecios />} />

                <Route path="/cliente/mis-pedidos" element={<MisPedidos />} />
                <Route path="/cliente/nuevo-pedido" element={<NuevoPedido />} />
                <Route path="/cliente/seguimiento" element={<Seguimiento />} />

                <Route path="/transportista/ruta" element={<RutaDia />} />
                <Route path="/transportista/entregas" element={<ConfirmarEntrega />} />

                <Route path="/operario/lotes" element={<MisLotes />} />
                <Route path="/operario/nuevo-lote" element={<NuevoLote />} />

                <Route path="/perfil" element={<Perfil />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
