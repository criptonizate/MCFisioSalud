import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'

export default function Register() {
  const { register, registerWithGoogle } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nombre: '', apellido: '', dni: '', telefono: '',
    fechaNacimiento: '', email: '', password: '', confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  function validate() {
    const e = {}
    if (!form.nombre.trim()) e.nombre = 'Requerido'
    if (!form.apellido.trim()) e.apellido = 'Requerido'
    if (!form.dni.trim()) e.dni = 'Requerido'
    if (!form.telefono.trim()) e.telefono = 'Requerido'
    if (!form.fechaNacimiento) e.fechaNacimiento = 'Requerido'
    if (!form.email.trim()) e.email = 'Requerido'
    if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Las contraseñas no coinciden'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }
    setLoading(true)
    try {
      await register(form.email, form.password, form.nombre, form.apellido, form.dni, form.telefono, form.fechaNacimiento)
      toast({ message: 'Cuenta creada exitosamente', type: 'success' })
      navigate('/', { replace: true })
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        toast({ message: 'Ese email ya está registrado', type: 'error' })
      } else {
        toast({ message: 'Error al crear la cuenta', type: 'error' })
      }
    } finally {
      setLoading(false)
    }
  }

  function set(field) {
    return e => {
      setForm(p => ({ ...p, [field]: e.target.value }))
      setErrors(p => ({ ...p, [field]: undefined }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#1565C0] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">MC</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Merriweather, serif' }}>
            Crear cuenta
          </h1>
          <p className="text-gray-500 text-sm mt-1">Completá tus datos para registrarte</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Nombre" placeholder="Juan" value={form.nombre} onChange={set('nombre')} error={errors.nombre} />
              <Input label="Apellido" placeholder="Pérez" value={form.apellido} onChange={set('apellido')} error={errors.apellido} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="DNI" placeholder="12345678" value={form.dni} onChange={set('dni')} error={errors.dni} />
              <Input label="Teléfono" placeholder="3804123456" value={form.telefono} onChange={set('telefono')} error={errors.telefono} />
            </div>
            <Input label="Fecha de nacimiento" type="date" value={form.fechaNacimiento} onChange={set('fechaNacimiento')} error={errors.fechaNacimiento} />
            <Input label="Email" type="email" placeholder="tu@email.com" value={form.email} onChange={set('email')} error={errors.email} />
            <Input label="Contraseña" type="password" placeholder="Mínimo 6 caracteres" value={form.password} onChange={set('password')} error={errors.password} />
            <Input label="Confirmar contraseña" type="password" placeholder="Repetí tu contraseña" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />

            <Button type="submit" loading={loading} size="lg" className="w-full mt-2">
              Crear cuenta
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            ¿Ya tenés cuenta?{' '}
            <Link to="/auth/login" className="text-[#1565C0] font-medium hover:underline">
              Iniciá sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
