import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import { RequireAdmin, RequirePaciente } from './components/layout/ProtectedRoute'
import { Spinner } from './components/ui/Spinner'
import { ROLES } from './constants'

import Login from './pages/auth/Login'

import AdminLayout from './components/layout/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Agenda from './pages/admin/Agenda'
import Pacientes from './pages/admin/Pacientes'
import Estadisticas from './pages/admin/Estadisticas'
import Configuracion from './pages/admin/Configuracion'

import PacienteLayout from './components/layout/PacienteLayout'
import Inicio from './pages/paciente/Inicio'
import Reservar from './pages/paciente/Reservar'
import MisTurnos from './pages/paciente/MisTurnos'
import Perfil from './pages/paciente/Perfil'

function RootRedirect() {
  const { user, userData, loading } = useAuth()
  if (loading) return <Spinner className="min-h-screen" />
  if (!user) return <Navigate to="/paciente" replace />
  if (userData?.rol === ROLES.ADMIN) return <Navigate to="/admin" replace />
  return <Navigate to="/paciente/mis-turnos" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* Login con Google */}
      <Route path="/auth/login" element={<Login />} />

      {/* Admin */}
      <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="pacientes" element={<Pacientes />} />
        <Route path="estadisticas" element={<Estadisticas />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>

      {/* Paciente — public landing (anónimo puede ver) */}
      <Route path="/paciente" element={<Inicio />} />

      {/* Paciente — reservar es público (auth solo al confirmar), mis-turnos y perfil requieren login */}
      <Route path="/paciente" element={<PacienteLayout />}>
        <Route path="reservar" element={<Reservar />} />
        <Route path="mis-turnos" element={<RequirePaciente><MisTurnos /></RequirePaciente>} />
        <Route path="perfil" element={<RequirePaciente><Perfil /></RequirePaciente>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
