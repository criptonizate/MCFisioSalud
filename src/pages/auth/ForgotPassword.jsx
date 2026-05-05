import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch {
      toast({ message: 'No se pudo enviar el email. Verificá la dirección.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1565C0] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">MC</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Recuperar contraseña</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">Email enviado</h3>
              <p className="text-sm text-gray-500 mb-6">
                Revisá tu bandeja de entrada en <strong>{email}</strong> y seguí las instrucciones.
              </p>
              <Link to="/auth/login">
                <Button variant="outline" size="lg" className="w-full">Volver al login</Button>
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-6">
                Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <Button type="submit" loading={loading} size="lg" className="w-full">
                  Enviar email
                </Button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                <Link to="/auth/login" className="text-[#1565C0] hover:underline">← Volver al login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
