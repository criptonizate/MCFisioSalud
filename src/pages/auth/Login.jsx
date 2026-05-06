import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'

export default function Login() {
  const { user, loginWithGoogle } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(false)

  const redirectTo = searchParams.get('redirect') || '/'

  // Navegar cuando AuthContext confirma que el usuario está autenticado
  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true })
    }
  }, [user])

  async function handleLogin() {
    setLoading(true)
    try {
      await loginWithGoogle()
      // No navegar aquí — el useEffect de arriba lo hace cuando onAuthStateChanged dispara
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        toast({ message: 'Error al iniciar sesión con Google', type: 'error' })
      }
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <img
            src="/Logo_fisiosalud.png"
            alt="FisioSalud"
            className="h-36 w-auto object-contain mx-auto"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Ingresá con tu cuenta</h2>
            <p className="text-sm text-gray-400 mt-1">
              Necesitás una cuenta de Google para reservar turnos
            </p>
          </div>

          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={handleLogin}
            loading={loading}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5"
            />
            Continuar con Google
          </Button>

          <button
            onClick={() => navigate('/paciente')}
            className="text-sm text-gray-400 hover:text-gray-600 hover:underline"
          >
            ← Volver
          </button>
        </div>

      </div>
    </div>
  )
}
