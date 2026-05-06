import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'
import { REGLAS_NEGOCIO, CONFIG_DEFAULT } from '../../constants'
import { Button } from '../../components/ui/Button'
import { MapPin, Phone, MessageCircle, LogIn, Calendar, UserCheck, FileText, CheckCircle } from 'lucide-react'
import { WA_ADMIN } from '../../constants'

const WA_URL = `https://wa.me/${WA_ADMIN}`
const MAPS_URL = 'https://www.google.com/maps/search/?api=1&query=Avellaneda+112,+F5302DBZ+La+Rioja,+Argentina'

const ICONOS_REGLAS = ['📋', '🏥', '👕', '1️⃣', '📅', '⏰']

export default function Inicio() {
  const { user, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [loggingIn, setLoggingIn] = useState(false)

  async function handleLogin() {
    setLoggingIn(true)
    try { await loginWithGoogle() } catch {}
    finally { setLoggingIn(false) }
  }

  return (
    <>
      <div className="min-h-screen flex flex-col">

        {/* Hero — fondo blanco */}
        <div className="bg-white px-4 pt-5 pb-5 text-center border-b border-gray-100">
          <img
            src="/Logo_fisiosalud.png"
            alt="FisioSalud"
            className="w-[70%] max-w-xs h-auto object-contain mx-auto mb-2"
          />
          <h1 className="text-2xl font-bold text-[#1565C0] mb-0.5">Lic. Miguel Carrizo</h1>
          <p className="text-gray-500 text-sm mb-3">Rehabilitación Traumatológica y Deportiva</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-sm">
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              Avellaneda 112, La Rioja
            </a>
            <a
              href={`tel:${CONFIG_DEFAULT.telefono}`}
              className="flex items-center gap-1.5 text-green-700 border border-green-200 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-full transition-colors"
            >
              <Phone className="w-3.5 h-3.5 shrink-0" />
              {CONFIG_DEFAULT.telefono}
            </a>
          </div>

          {user && (
            <div className="mt-4 flex items-center justify-center gap-2">
              {user.photoURL && (
                <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full border border-blue-200" referrerPolicy="no-referrer" />
              )}
              <span className="text-sm text-gray-500">
                Hola, <strong className="text-gray-700">{user.displayName?.split(' ')[0]}</strong>
              </span>
              <button
                onClick={() => navigate('/paciente/mis-turnos')}
                className="text-sm text-[#1565C0] hover:underline font-medium"
              >
                Mis turnos →
              </button>
            </div>
          )}
        </div>

        {/* Contenido — fondo con imagen */}
        <div
          className="flex-1 relative px-4 pt-8 pb-24"
          style={{
            backgroundImage: 'url(/wallpaper-fisio.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Overlay oscuro para legibilidad */}
          <div className="absolute inset-0 bg-[#1565C0]/70 pointer-events-none" />

          <div className="relative max-w-xl mx-auto space-y-4">

            {/* Cómo funciona */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
              <h2 className="text-sm font-semibold text-white mb-4 text-center">¿Cómo funciona?</h2>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { icon: Calendar,      label: 'Elegí día y horario',     color: 'bg-blue-50 text-[#1565C0]' },
                  { icon: UserCheck,     label: 'Ingresá con Google',       color: 'bg-purple-50 text-purple-600' },
                  { icon: MessageCircle, label: 'Kine te confirma',         color: 'bg-green-50 text-green-600' },
                  { icon: FileText,      label: 'Asistí con pedido médico', color: 'bg-amber-50 text-amber-600' },
                ].map(({ icon: Icon, label, color }, i, arr) => (
                  <div key={i} className="flex flex-col items-center gap-2 relative">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-white/90 text-center leading-tight font-medium">{label}</p>
                    {i < arr.length - 1 && (
                      <div className="absolute top-6 left-[calc(50%+24px)] right-[calc(-50%+24px)] h-px bg-white/30" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Instrucciones */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-500" />
                Instrucciones importantes
              </h2>
              <ul className="space-y-3">
                {REGLAS_NEGOCIO.map((regla, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="text-base shrink-0 leading-snug">{ICONOS_REGLAS[i] ?? '•'}</span>
                    <span className="text-sm text-gray-600 leading-snug">{regla}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA — al final, después de leer todo */}
            <div className="bg-white rounded-2xl shadow-lg p-5 text-center space-y-3">
              <p className="text-gray-600 text-sm">¿Listo? Reservá tu turno online en segundos</p>
              <Button size="lg" className="w-full text-base" onClick={() => navigate('/paciente/reservar')}>
                <Calendar className="w-5 h-5" />
                Reservar turno
              </Button>

              {!user && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gray-100" />
                    <span className="text-xs text-gray-400">o</span>
                    <div className="flex-1 h-px bg-gray-100" />
                  </div>
                  <button
                    onClick={handleLogin}
                    disabled={loggingIn}
                    className="w-full flex items-center justify-center gap-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors disabled:opacity-60"
                  >
                    <img
                      src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                      alt="Google"
                      className="w-4 h-4"
                    />
                    {loggingIn ? 'Ingresando...' : 'Ingresar con Google'}
                  </button>
                </>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Botón flotante WhatsApp */}
      <a
        href={WA_URL}
        target="_blank"
        rel="noreferrer"
        title="Escribinos por WhatsApp"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white pl-4 pr-5 py-3 rounded-full shadow-xl transition-all hover:scale-105"
      >
        <MessageCircle className="w-5 h-5 shrink-0" />
        <span className="text-sm font-semibold">Consultar</span>
      </a>
    </>
  )
}
