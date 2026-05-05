import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LayoutDashboard, Calendar, Users, Settings, LogOut, Menu, BarChart2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../utils'

const navItems = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/agenda', label: 'Agenda', icon: Calendar },
  { to: '/admin/pacientes', label: 'Pacientes', icon: Users },
  { to: '/admin/estadisticas', label: 'Estadísticas', icon: BarChart2 },
  { to: '/admin/configuracion', label: 'Configuración', icon: Settings },
]

export default function AdminLayout() {
  const { userData, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/paciente')
  }

  const Sidebar = ({ mobile = false }) => (
    <div className={cn('flex flex-col h-full bg-[#1565C0]', mobile ? 'w-full' : 'w-64')}>

      {/* Logo simple — lleva al home */}
      <div className="px-5 py-5 border-b border-blue-500">
        <Link to="/paciente" onClick={() => setSidebarOpen(false)}>
          <img
            src="/Logo_fisiosalud_simple.png"
            alt="FisioSalud"
            className="h-10 w-auto object-contain bg-white rounded-xl px-2 py-1"
          />
        </Link>
        <p className="text-blue-200 text-xs mt-2 pl-1">Panel administrador</p>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors',
                isActive
                  ? 'bg-white text-[#1565C0]'
                  : 'text-blue-100 hover:bg-blue-600 hover:text-white',
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-blue-500">
        <div className="px-3 py-2 mb-2">
          <p className="text-white text-sm font-medium truncate">{userData?.nombre} {userData?.apellido}</p>
          <p className="text-blue-200 text-xs truncate">{userData?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-blue-100 hover:bg-blue-600 hover:text-white transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 z-50">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <Menu className="w-5 h-5 text-gray-600" />
          </button>
          <Link to="/paciente">
            <img src="/Logo_fisiosalud_simple.png" alt="FisioSalud" className="h-8 w-auto object-contain" />
          </Link>
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
