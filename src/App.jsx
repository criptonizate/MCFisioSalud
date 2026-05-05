import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/ui/Toast'
import { RequireAdmin, RequirePaciente } from './components/layout/ProtectedRoute'
import { Spinner } from './components/ui/Spinner'
import { ROLES } from './constants'

const Login        = lazy(() => import('./pages/auth/Login'))
const AdminLayout  = lazy(() => import('./components/layout/AdminLayout'))
const Dashboard    = lazy(() => import('./pages/admin/Dashboard'))
const Agenda       = lazy(() => import('./pages/admin/Agenda'))
const Pacientes    = lazy(() => import('./pages/admin/Pacientes'))
const Estadisticas = lazy(() => import('./pages/admin/Estadisticas'))
const Configuracion= lazy(() => import('./pages/admin/Configuracion'))
const PacienteLayout = lazy(() => import('./components/layout/PacienteLayout'))
const Inicio       = lazy(() => import('./pages/paciente/Inicio'))
const Reservar     = lazy(() => import('./pages/paciente/Reservar'))
const MisTurnos    = lazy(() => import('./pages/paciente/MisTurnos'))
const Perfil       = lazy(() => import('./pages/paciente/Perfil'))

const PageLoader = <Spinner className="min-h-screen" />

function RootRedirect() {
  const { user, userData, loading } = useAuth()
  if (loading) return <Spinner className="min-h-screen" />
  if (!user) return <Navigate to="/paciente" replace />
  if (userData?.rol === ROLES.ADMIN) return <Navigate to="/admin" replace />
  return <Navigate to="/paciente/mis-turnos" replace />
}

function AppRoutes() {
  return (
    <Suspense fallback={PageLoader}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/auth/login" element={<Login />} />

        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<Dashboard />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="pacientes" element={<Pacientes />} />
          <Route path="estadisticas" element={<Estadisticas />} />
          <Route path="configuracion" element={<Configuracion />} />
        </Route>

        <Route path="/paciente" element={<Inicio />} />

        <Route path="/paciente" element={<PacienteLayout />}>
          <Route path="reservar" element={<Reservar />} />
          <Route path="mis-turnos" element={<RequirePaciente><MisTurnos /></RequirePaciente>} />
          <Route path="perfil" element={<RequirePaciente><Perfil /></RequirePaciente>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
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
