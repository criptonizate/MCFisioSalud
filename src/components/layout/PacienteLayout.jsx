import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Calendar, User, LogOut, Clock, LogIn } from 'lucide-react'
import { cn } from '../../utils'

export default function PacienteLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/paciente')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between h-14">

          <Link to="/paciente">
            <img
              src="/Logo_fisiosalud_simple.png"
              alt="FisioSalud"
              className="h-9 w-auto object-contain"
            />
          </Link>

          <div className="flex items-center gap-1">
            <NavLink
              to="/paciente/reservar"
              className={({ isActive }) =>
                cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-blue-50 text-[#1565C0]' : 'text-gray-500 hover:bg-gray-100')
              }
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Reservar</span>
            </NavLink>

            {user ? (
              <>
                <NavLink
                  to="/paciente/mis-turnos"
                  className={({ isActive }) =>
                    cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      isActive ? 'bg-blue-50 text-[#1565C0]' : 'text-gray-500 hover:bg-gray-100')
                  }
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Mis turnos</span>
                </NavLink>

                <NavLink
                  to="/paciente/perfil"
                  className={({ isActive }) =>
                    cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      isActive ? 'bg-blue-50 text-[#1565C0]' : 'text-gray-500 hover:bg-gray-100')
                  }
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">Perfil</span>
                </NavLink>

                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || ''}
                    className="w-7 h-7 rounded-full border border-gray-200 ml-1"
                    title={user.displayName || ''}
                  />
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:bg-gray-100 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                to="/auth/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[#1565C0] hover:bg-blue-50 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Ingresar</span>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
