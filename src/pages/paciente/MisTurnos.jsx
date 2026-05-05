import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useConfig } from '../../hooks/useConfig'
import { useToast } from '../../components/ui/Toast'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { getTurnosByPaciente, actualizarTurno } from '../../services/turnos.service'
import { formatFechaLarga } from '../../utils'
import { Calendar, Clock, RefreshCw, MessageCircle, CreditCard } from 'lucide-react'
import { WA_ADMIN } from '../../constants'

const STATUS_BAR = {
  pendiente: 'bg-yellow-400', confirmado: 'bg-[#1565C0]',
  completado: 'bg-green-500', cancelado: 'bg-gray-300', propuesto: 'bg-purple-500',
}

function getRelativeLabel(fecha) {
  if (!fecha) return ''
  const d = fecha?.toDate ? fecha.toDate() : new Date(fecha)
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const target = new Date(d); target.setHours(0, 0, 0, 0)
  const diff = Math.round((target - hoy) / 86400000)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === 2) return 'Pasado mañana'
  if (diff > 2 && diff <= 7) return `En ${diff} días`
  return formatFechaLarga(d)
}

function canCancel(turno, horasLimite = 24) {
  const fd = turno.fecha?.toDate ? turno.fecha.toDate() : new Date(turno.fecha)
  const [h, m] = (turno.horaInicio || '00:00').split(':').map(Number)
  fd.setHours(h, m, 0, 0)
  return fd - new Date() > horasLimite * 60 * 60 * 1000
}

export default function MisTurnos() {
  const { user } = useAuth()
  const { config } = useConfig()
  const toast = useToast()

  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(null)
  const [cancelling, setCancelling] = useState(false)
  const [respondiendo, setRespondiendo] = useState(false)

  async function load() {
    const ts = await getTurnosByPaciente(user.uid)
    setTurnos(ts)
    setLoading(false)
  }

  useEffect(() => { if (user) load() }, [user])

  async function handleCancel() {
    setCancelling(true)
    try {
      await actualizarTurno(confirming.id, { estado: 'cancelado', canceladoPor: 'paciente' })
      toast({ message: 'Turno cancelado', type: 'success' })
      setConfirming(null); load()
    } catch { toast({ message: 'Error al cancelar', type: 'error' }) }
    finally { setCancelling(false) }
  }

  async function responderPropuesta(turno, aceptar) {
    setRespondiendo(true)
    try {
      await actualizarTurno(turno.id, { estado: aceptar ? 'confirmado' : 'cancelado' })
      toast({ message: aceptar ? 'Turno confirmado' : 'Propuesta rechazada', type: aceptar ? 'success' : 'info' })
      load()
    } catch { toast({ message: 'Error al responder', type: 'error' }) }
    finally { setRespondiendo(false) }
  }

  const hoy = new Date()
  const propuestos = turnos.filter(t => t.estado === 'propuesto')
  const proximos   = turnos.filter(t => { const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha); return fd >= hoy && ['pendiente','confirmado'].includes(t.estado) })
  const pasados    = turnos.filter(t => { const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha); return fd < hoy || ['cancelado','completado'].includes(t.estado) })

  if (loading) return <Spinner className="h-48" />

  const mpAlias = config?.mpAlias

  function TurnoCard({ t, showCancel = false }) {
    const fd = t.fecha?.toDate ? t.fecha.toDate() : null
    const relLabel = getRelativeLabel(t.fecha)
    const canc = showCancel && ['pendiente','confirmado'].includes(t.estado) && canCancel(t, config?.horasLimiteCancelacion)
    const isHoy = relLabel === 'Hoy'
    const waComprobanteUrl = `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(`Hola! Te envío el comprobante de pago de mi turno del ${fd ? formatFechaLarga(fd) : ''} a las ${t.horaInicio}hs.`)}`

    return (
      <div className={`bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex ${t.estado==='cancelado'?'opacity-55':''}`}>
        <div className={`w-1.5 shrink-0 ${STATUS_BAR[t.estado]}`} />
        <div className="flex-1 p-4 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={`font-semibold text-sm ${isHoy ? 'text-[#1565C0]' : 'text-gray-800'}`}>
                {relLabel}
                {isHoy && <span className="ml-2 text-[10px] bg-[#1565C0] text-white rounded-full px-2 py-0.5 font-bold">HOY</span>}
              </p>
              {fd && relLabel !== formatFechaLarga(fd) && (
                <p className="text-xs text-gray-400">{formatFechaLarga(fd)}</p>
              )}
            </div>
            <Badge estado={t.estado} />
          </div>

          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            {t.horaInicio} – {t.horaFin}
          </div>

          {t.notasPaciente && (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 italic">"{t.notasPaciente}"</p>
          )}

          {/* Pago con MercadoPago */}
          {mpAlias && ['pendiente','confirmado'].includes(t.estado) && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-800">
                <CreditCard className="w-3.5 h-3.5" /> Transferencia / MercadoPago
              </div>
              <p className="text-xs text-blue-700">Alias: <strong>{mpAlias}</strong>{config?.mpTitular ? ` · ${config.mpTitular}` : ''}</p>
              <a href={waComprobanteUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-green-600 hover:underline">
                <MessageCircle className="w-3.5 h-3.5" /> Enviar comprobante de pago
              </a>
            </div>
          )}

          {canc && (
            <button onClick={() => setConfirming(t)} className="text-xs text-red-500 hover:text-red-700 hover:underline">
              Cancelar turno
            </button>
          )}
          {showCancel && ['pendiente','confirmado'].includes(t.estado) && !canCancel(t, config?.horasLimiteCancelacion) && (
            <p className="text-xs text-gray-400">Cancelación no disponible (menos de {config?.horasLimiteCancelacion || 24}hs)</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Mis turnos</h1>

      {/* Propuestos por el kinesiólogo */}
      {propuestos.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-purple-500 uppercase tracking-widest mb-3">Reprogramación propuesta</h2>
          <div className="space-y-3">
            {propuestos.map(t => {
              const fd = t.fecha?.toDate ? t.fecha.toDate() : null
              return (
                <div key={t.id} className="bg-white rounded-xl border-2 border-purple-200 overflow-hidden flex">
                  <div className="w-1.5 shrink-0 bg-purple-500" />
                  <div className="flex-1 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-purple-500 shrink-0" />
                      <p className="font-semibold text-sm text-gray-800">El profesional propone un nuevo horario</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg px-4 py-3 space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Calendar className="w-3.5 h-3.5 text-purple-400" />
                        {fd ? formatFechaLarga(fd) : '—'}
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-3.5 h-3.5 text-purple-400" />
                        {t.horaInicio} – {t.horaFin}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => responderPropuesta(t, true)} loading={respondiendo} className="flex-1">
                        Aceptar
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => responderPropuesta(t, false)} loading={respondiendo} className="flex-1">
                        Rechazar
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Próximos */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Próximos</h2>
        {proximos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center space-y-4">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
              <Calendar className="w-7 h-7 text-[#1565C0]" />
            </div>
            <div>
              <p className="font-medium text-gray-700">No tenés turnos próximos</p>
              <p className="text-sm text-gray-400 mt-1">Reservá un turno y aparecerá aquí</p>
            </div>
            <Link to="/paciente/reservar"><Button size="sm">Reservar turno</Button></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {proximos.map(t => <TurnoCard key={t.id} t={t} showCancel />)}
          </div>
        )}
      </section>

      {/* Historial */}
      {pasados.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Historial</h2>
          <div className="space-y-3">
            {pasados.map(t => <TurnoCard key={t.id} t={t} />)}
          </div>
        </section>
      )}

      {/* Modal cancelación */}
      <Modal open={!!confirming} onClose={() => setConfirming(null)} title="Cancelar turno" size="sm">
        <div className="space-y-4">
          <div className="bg-red-50 rounded-xl p-4 text-sm text-red-800">
            <p>Estás por cancelar el turno del <strong>{confirming?.fecha ? getRelativeLabel(confirming.fecha) : ''}</strong> a las <strong>{confirming?.horaInicio}hs</strong>.</p>
            <p className="mt-1 text-red-500 text-xs">Esta acción no se puede deshacer.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="danger" loading={cancelling} onClick={handleCancel} className="flex-1">Sí, cancelar</Button>
            <Button variant="secondary" onClick={() => setConfirming(null)} className="flex-1">No, volver</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
