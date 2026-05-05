import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { getPacienteByUserId, updateUserData } from '../../services/pacientes.service'
import { getObrasSociales } from '../../services/obrasSociales.service'
import { MessageCircle } from 'lucide-react'
import { WA_ADMIN } from '../../constants'

export default function Perfil() {
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [obrasSociales, setObrasSociales] = useState([])

  async function load() {
    const [p, os] = await Promise.all([
      getPacienteByUserId(user.uid),
      getObrasSociales(),
    ])
    setForm({
      nombre: p?.nombre || '',
      apellido: p?.apellido || '',
      dni: p?.dni || '',
      telefono: p?.telefono || '',
      fechaNacimiento: p?.fechaNacimiento || '',
      obraSocialId: p?.obraSocialId || '',
    })
    setObrasSociales(os)
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [user])

  async function handleSave() {
    if (!form.nombre.trim()) {
      toast({ message: 'El nombre es obligatorio', type: 'error' }); return
    }
    if (!form.telefono.trim()) {
      toast({ message: 'El teléfono es obligatorio', type: 'error' }); return
    }
    setSaving(true)
    try {
      await updateUserData(user.uid, { ...form, obraSocialId: form.obraSocialId || null })
      toast({ message: 'Datos guardados', type: 'success' })
    } catch {
      toast({ message: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function set(field) { return e => setForm(p => ({ ...p, [field]: e.target.value })) }

  if (loading) return <Spinner className="h-48" />

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-800">Mi perfil</h1>

      <Card>
        <CardHeader><h2 className="font-semibold text-gray-700">Datos personales</h2></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre *" value={form.nombre} onChange={set('nombre')} />
            <Input label="Apellido" value={form.apellido} onChange={set('apellido')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="DNI" value={form.dni} onChange={set('dni')} inputMode="numeric" />
            <Input label="Teléfono *" value={form.telefono} onChange={set('telefono')} type="tel" />
          </div>
          <Input label="Fecha de nacimiento" type="date" value={form.fechaNacimiento} onChange={set('fechaNacimiento')} />
          <Input label="Email" value={user?.email || ''} disabled />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Obra Social</label>
            <select
              value={form.obraSocialId}
              onChange={e => setForm(p => ({ ...p, obraSocialId: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] bg-white"
            >
              <option value="">Particular (sin obra social)</option>
              {obrasSociales.map(os => (
                <option key={os.id} value={os.id}>{os.nombre}</option>
              ))}
            </select>
          </div>

          <Button onClick={handleSave} loading={saving}>Guardar cambios</Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold text-gray-700">Pedido médico</h2></CardHeader>
        <CardBody className="space-y-3">
          <p className="text-sm text-gray-500">
            Enviá una foto de tu pedido médico directamente por WhatsApp al número del consultorio.
          </p>
          <a
            href={`https://wa.me/${WA_ADMIN}?text=${encodeURIComponent('Hola! Te envío mi pedido médico.')}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar por WhatsApp · 3804362882
          </a>
        </CardBody>
      </Card>
    </div>
  )
}
