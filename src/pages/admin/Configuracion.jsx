import { useEffect, useState } from 'react'
import { useConfig } from '../../hooks/useConfig'
import { getDisponibilidad, updateDisponibilidadDia } from '../../services/disponibilidad.service'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Card, CardHeader, CardBody } from '../../components/ui/Card'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { DIAS_SEMANA, DIAS_LABELS } from '../../constants'
import { Plus, Trash2, CreditCard } from 'lucide-react'

const TABS = ['Perfil', 'Disponibilidad', 'Configuración', 'Pagos', 'Automatización']

export default function Configuracion() {
  const toast = useToast()
  const { config, loading: cfgLoading, save: saveConfig } = useConfig()
  const [activeTab, setActiveTab] = useState(0)
  const [perfil, setPerfil] = useState({})
  const [ajustes, setAjustes] = useState({})
  const [pagos, setPagos] = useState({})
  const [auto, setAuto] = useState({})
  const [saving, setSaving] = useState(false)
  const [disponibilidad, setDisponibilidad] = useState({})
  const [dispLoading, setDispLoading] = useState(true)

  useEffect(() => {
    if (config) {
      setPerfil({
        nombreProfesional: config.nombreProfesional || '',
        descripcion: config.descripcion || '',
        direccion: config.direccion || '',
        telefono: config.telefono || '',
        mensajeBienvenida: config.mensajeBienvenida || '',
      })
      setAjustes({
        toleranciaMinutos: config.toleranciaMinutos || 10,
        horasLimiteCancelacion: config.horasLimiteCancelacion || 24,
        duracionSesionMin: config.duracionSesionMin || 30,
        precioPorSesion: config.precioPorSesion || 0,
      })
      setPagos({
        mpAlias: config.mpAlias || '',
        mpTitular: config.mpTitular || '',
      })
      setAuto({
        autoConfirmar: config.autoConfirmar || false,
        mensajeRecordatorio: config.mensajeRecordatorio || '¡Hola {{nombre}}! Te recordamos tu turno en FisioSalud el {{fecha}} a las {{hora}}hs. ¡Te esperamos!',
      })
    }
  }, [config])

  useEffect(() => {
    getDisponibilidad().then(d => { setDisponibilidad(d); setDispLoading(false) })
  }, [])

  async function handleSavePerfil() {
    setSaving(true)
    try {
      await saveConfig(perfil)
      toast({ message: 'Perfil guardado', type: 'success' })
    } catch {
      toast({ message: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveAjustes() {
    setSaving(true)
    try {
      await saveConfig(ajustes)
      toast({ message: 'Configuración guardada', type: 'success' })
    } catch {
      toast({ message: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function toggleDia(dia) {
    setDisponibilidad(prev => ({
      ...prev,
      [dia]: { ...prev[dia], activo: !prev[dia]?.activo }
    }))
  }

  function addFranja(dia) {
    setDisponibilidad(prev => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        franjas: [...(prev[dia]?.franjas || []), { inicio: '08:00', fin: '12:00', capacidad: 3 }]
      }
    }))
  }

  function removeFranja(dia, idx) {
    setDisponibilidad(prev => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        franjas: prev[dia].franjas.filter((_, i) => i !== idx)
      }
    }))
  }

  function updateFranja(dia, idx, field, value) {
    setDisponibilidad(prev => {
      const franjas = [...prev[dia].franjas]
      franjas[idx] = { ...franjas[idx], [field]: value }
      return { ...prev, [dia]: { ...prev[dia], franjas } }
    })
  }

  async function handleSaveDisponibilidad() {
    setSaving(true)
    try {
      await Promise.all(
        DIAS_SEMANA.map(dia => updateDisponibilidadDia(dia, disponibilidad[dia] || { activo: false, franjas: [] }))
      )
      toast({ message: 'Disponibilidad guardada', type: 'success' })
    } catch {
      toast({ message: 'Error al guardar', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (cfgLoading) return <Spinner className="h-64" />

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setActiveTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === i ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Perfil */}
      {activeTab === 0 && (
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-800">Datos del profesional</h2></CardHeader>
          <CardBody className="space-y-4">
            <Input label="Nombre profesional" value={perfil.nombreProfesional || ''} onChange={e => setPerfil(p => ({ ...p, nombreProfesional: e.target.value }))} />
            <Textarea label="Descripción / especialidades" value={perfil.descripcion || ''} onChange={e => setPerfil(p => ({ ...p, descripcion: e.target.value }))} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Dirección" value={perfil.direccion || ''} onChange={e => setPerfil(p => ({ ...p, direccion: e.target.value }))} />
              <Input label="Teléfono" value={perfil.telefono || ''} onChange={e => setPerfil(p => ({ ...p, telefono: e.target.value }))} />
            </div>
            <Textarea label="Mensaje de bienvenida (visible para pacientes)" value={perfil.mensajeBienvenida || ''} onChange={e => setPerfil(p => ({ ...p, mensajeBienvenida: e.target.value }))} />
            <Button onClick={handleSavePerfil} loading={saving}>Guardar</Button>
          </CardBody>
        </Card>
      )}

      {/* Disponibilidad */}
      {activeTab === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Horarios de atención</h2>
              <Button size="sm" onClick={handleSaveDisponibilidad} loading={saving}>Guardar</Button>
            </div>
          </CardHeader>
          <CardBody>
            {dispLoading ? <Spinner /> : (
              <div className="space-y-4">
                {DIAS_SEMANA.map(dia => {
                  const d = disponibilidad[dia] || { activo: false, franjas: [] }
                  return (
                    <div key={dia} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={d.activo || false}
                            onChange={() => toggleDia(dia)}
                            className="w-4 h-4 accent-[#1565C0]"
                          />
                          <span className="font-medium text-gray-700">{DIAS_LABELS[dia]}</span>
                        </label>
                        {d.activo && (
                          <button onClick={() => addFranja(dia)} className="text-sm text-[#1565C0] flex items-center gap-1 hover:underline">
                            <Plus className="w-3.5 h-3.5" /> Agregar franja
                          </button>
                        )}
                      </div>
                      {d.activo && (
                        <div className="space-y-2 pl-7">
                          {(d.franjas || []).map((f, idx) => (
                            <div key={idx} className="flex items-center gap-2 flex-wrap">
                              <input
                                type="time"
                                value={f.inicio}
                                onChange={e => updateFranja(dia, idx, 'inicio', e.target.value)}
                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
                              />
                              <span className="text-gray-400 text-sm">hasta</span>
                              <input
                                type="time"
                                value={f.fin}
                                onChange={e => updateFranja(dia, idx, 'fin', e.target.value)}
                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
                              />
                              <span className="text-gray-400 text-xs">cupos:</span>
                              <input
                                type="number"
                                min="1"
                                max="20"
                                value={f.capacidad ?? 1}
                                onChange={e => updateFranja(dia, idx, 'capacidad', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-14 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
                              />
                              <button onClick={() => removeFranja(dia, idx)} className="text-red-400 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          {(d.franjas || []).length === 0 && (
                            <p className="text-sm text-gray-400">Agregá al menos una franja horaria</p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Ajustes */}
      {activeTab === 2 && (
        <Card>
          <CardHeader><h2 className="font-semibold text-gray-800">Parámetros operativos</h2></CardHeader>
          <CardBody className="space-y-4">
            <div>
              <Input label="Duración de sesión (minutos)" type="number" min="15" step="15" value={ajustes.duracionSesionMin || 45} onChange={e => setAjustes(p => ({ ...p, duracionSesionMin: parseInt(e.target.value) }))} />
              {ajustes.duracionSesionMin !== config?.duracionSesionMin && (
                <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ Este cambio aplica sólo a turnos nuevos. Los turnos ya confirmados mantienen su horario de fin original.
                </p>
              )}
            </div>
            <Input label="Tolerancia máxima de espera (minutos)" type="number" min="0" value={ajustes.toleranciaMinutos || 10} onChange={e => setAjustes(p => ({ ...p, toleranciaMinutos: parseInt(e.target.value) }))} />
            <Input label="Límite de cancelación (horas antes del turno)" type="number" min="1" value={ajustes.horasLimiteCancelacion || 24} onChange={e => setAjustes(p => ({ ...p, horasLimiteCancelacion: parseInt(e.target.value) }))} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio por sesión ($)</label>
              <input
                type="number"
                min="0"
                step="100"
                value={ajustes.precioPorSesion || 0}
                onChange={e => setAjustes(p => ({ ...p, precioPorSesion: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
              />
              <p className="text-xs text-gray-400 mt-1">Usado para calcular ingresos estimados en Estadísticas. No se muestra a los pacientes.</p>
            </div>
            <Button onClick={handleSaveAjustes} loading={saving}>Guardar</Button>
          </CardBody>
        </Card>
      )}

      {/* Pagos */}
      {activeTab === 3 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#1565C0]" />
              <h2 className="font-semibold text-gray-800">MercadoPago / Transferencia</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
              Estos datos se muestran al paciente en la confirmación de reserva y en "Mis Turnos", para que pueda realizar el pago y enviar el comprobante.
            </div>
            <Input
              label="Alias de MercadoPago o CBU/CVU"
              placeholder="Ej: fisiosalud.mp"
              value={pagos.mpAlias || ''}
              onChange={e => setPagos(p => ({ ...p, mpAlias: e.target.value }))}
            />
            <Input
              label="Nombre del titular"
              placeholder="Ej: Miguel Carrizo"
              value={pagos.mpTitular || ''}
              onChange={e => setPagos(p => ({ ...p, mpTitular: e.target.value }))}
            />
            {pagos.mpAlias && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1 text-sm">
                <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Vista previa para el paciente</p>
                <p className="text-gray-700">Alias: <strong>{pagos.mpAlias}</strong></p>
                {pagos.mpTitular && <p className="text-gray-700">Titular: <strong>{pagos.mpTitular}</strong></p>}
              </div>
            )}
            <Button onClick={async () => { setSaving(true); await saveConfig(pagos).finally(() => setSaving(false)); toast({ message: 'Datos de pago guardados', type: 'success' }) }} loading={saving}>
              Guardar
            </Button>
          </CardBody>
        </Card>
      )}
      {/* Automatización */}
      {activeTab === 4 && (
        <div className="space-y-4">
          <Card>
            <CardHeader><h2 className="font-semibold text-gray-800">Confirmación automática</h2></CardHeader>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Confirmar turnos automáticamente</p>
                  <p className="text-xs text-gray-400 mt-0.5">Los nuevos turnos quedan en estado "confirmado" sin necesitar tu aprobación manual.</p>
                </div>
                <button
                  onClick={() => setAuto(p => ({ ...p, autoConfirmar: !p.autoConfirmar }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${auto.autoConfirmar ? 'bg-[#1565C0]' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${auto.autoConfirmar ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {auto.autoConfirmar && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
                  ⚠️ Con esta opción activa, cualquier paciente queda confirmado sin revisión previa. Desactivala si querés controlar cada turno.
                </div>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="font-semibold text-gray-800">Mensaje de recordatorio WhatsApp</h2></CardHeader>
            <CardBody className="space-y-3">
              <p className="text-xs text-gray-400">
                Usá <code className="bg-gray-100 px-1 rounded">{'{{nombre}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{fecha}}'}</code> y <code className="bg-gray-100 px-1 rounded">{'{{hora}}'}</code> como variables.
              </p>
              <Textarea
                label="Mensaje"
                value={auto.mensajeRecordatorio || ''}
                onChange={e => setAuto(p => ({ ...p, mensajeRecordatorio: e.target.value }))}
                rows={3}
                placeholder="¡Hola {{nombre}}! Te recordamos tu turno..."
              />
              {auto.mensajeRecordatorio && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                  <p className="font-medium mb-1">Vista previa:</p>
                  <p>{auto.mensajeRecordatorio
                    .replace('{{nombre}}', 'María')
                    .replace('{{fecha}}', 'lunes 12 de mayo')
                    .replace('{{hora}}', '09:00')}</p>
                </div>
              )}
            </CardBody>
          </Card>

          <Button onClick={async () => {
            setSaving(true)
            await saveConfig(auto).finally(() => setSaving(false))
            toast({ message: 'Configuración guardada', type: 'success' })
          }} loading={saving}>
            Guardar automatización
          </Button>
        </div>
      )}
    </div>
  )
}
