import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { Badge } from '../../components/ui/Badge'
import { getPacienteByUserId, updateUserData } from '../../services/pacientes.service'
import { getObrasSociales } from '../../services/obrasSociales.service'
import { getTurnosByPaciente } from '../../services/turnos.service'
import { MessageCircle, Calendar, Clock } from 'lucide-react'
import { formatFechaLarga } from '../../utils'
import { WA_ADMIN } from '../../constants'

const WA_NUMBER = WA_ADMIN

export default function Perfil() {
  const { user } = useAuth()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [obrasSociales, setObrasSociales] = useState([])
  const [turnos, setTurnos] = useState([])

  async function load() {
    const [p, os, ts] = await Promise.all([
      getPacienteByUserId(user.uid),
      getObrasSociales(),
      getTurnosByPaciente(user.uid),
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
    setTurnos(ts)
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [user])

  async function handleSave() {
    setSaving(true)
    try {
      await updateUserData(user.uid, form)
      toast({ message: 'Datos guardados', type: 'success' })
    } catch {
      toast({ message: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function set(field) { return e => setForm(p => ({ ...p, [field]: e.target.value })) }

  if (loading) return <Spinner className="h-48" />

  const hoy = new Date()
  const proximos = turnos.filter(t => {
    const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
    return fd >= hoy && ['pendiente', 'confirmado'].includes(t.estado)
  })
  const historial = turnos.filter(t => {
    const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
    return fd < hoy || ['cancelado', 'completado'].includes(t.estado)
  })

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-gray-800">Mi perfil</h1>

      <Card>
        <CardHeader><h2 className="font-semibold text-gray-700">Datos personales</h2></CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombre" value={form.nombre} onChange={set('nombre')} />
            <Input label="Apellido" value={form.apellido} onChange={set('apellido')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="DNI" value={form.dni} onChange={set('dni')} />
            <Input label="Teléfono" value={form.telefono} onChange={set('telefono')} />
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
              <option value="">Sin obra social / Particular</option>
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
            href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola! Te envío mi pedido médico.')}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Enviar por WhatsApp · 3804362882
          </a>
        </CardBody>
      </Card>

      {/* Historial de sesiones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Mis sesiones</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{turnos.length} total</span>
          </div>
        </CardHeader>
        <CardBody>
          {turnos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin sesiones registradas</p>
          ) : (
            <div className="space-y-5">
              {proximos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-[#1565C0] uppercase tracking-widest mb-2">Próximas</p>
                  <div className="space-y-2">
                    {proximos.map(t => {
                      const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
                      return (
                        <div key={t.id} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-[#1565C0] shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-800">{formatFechaLarga(fd)}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />{t.horaInicio} – {t.horaFin}
                              </p>
                            </div>
                          </div>
                          <Badge estado={t.estado} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {historial.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Historial</p>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {historial.map(t => {
                      const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
                      return (
                        <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">{formatFechaLarga(fd)}</span>
                            <span className="text-gray-400 ml-2 text-xs">{t.horaInicio}</span>
                          </div>
                          <Badge estado={t.estado} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
