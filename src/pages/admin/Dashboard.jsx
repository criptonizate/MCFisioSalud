import { useEffect, useState, useCallback } from 'react'
import { Users, Calendar, Clock, XCircle, MessageCircle, CheckCircle, ChevronRight, Shield, RefreshCw } from 'lucide-react'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import { getMetricasDashboard, getTurnosPendientes, actualizarTurno } from '../../services/turnos.service'
import { getPacienteByUserId } from '../../services/pacientes.service'
import { getObrasSociales } from '../../services/obrasSociales.service'
import { formatHora, formatFechaLarga, formatFecha } from '../../utils'
import { WA_ADMIN } from '../../constants'

function MetricCard({ icon: Icon, label, value, color = 'blue', onClick }) {
  const colors = {
    blue:   'bg-blue-50 text-[#1565C0]',
    green:  'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red:    'bg-red-50 text-red-600',
  }
  return (
    <Card className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''} onClick={onClick}>
      <CardBody className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <p className="text-2xl font-bold text-gray-800">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
        {onClick && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
      </CardBody>
    </Card>
  )
}

export default function Dashboard() {
  const toast = useToast()
  const [metricas, setMetricas] = useState(null)
  const [turnosDetalle, setTurnosDetalle] = useState([])
  const [loading, setLoading] = useState(true)

  // Modal pendientes
  const [modalOpen, setModalOpen] = useState(false)
  const [pendientes, setPendientes] = useState([])
  const [pendientesLoading, setPendientesLoading] = useState(false)
  const [osMap, setOsMap] = useState({})
  const [actionLoading, setActionLoading] = useState(null)

  const load = useCallback(async () => {
    const m = await getMetricasDashboard()
    setMetricas(m)
    const detalle = await Promise.all(
      m.turnosHoy.map(async t => {
        const paciente = await getPacienteByUserId(t.userId).catch(() => null)
        return { ...t, paciente }
      })
    )
    setTurnosDetalle(detalle)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const interval = setInterval(() => { load() }, 60000)
    return () => clearInterval(interval)
  }, [load])

  async function abrirPendientes() {
    setModalOpen(true)
    setPendientesLoading(true)
    const [ts, os] = await Promise.all([
      getTurnosPendientes(),
      getObrasSociales(),
    ])
    const osMapLocal = Object.fromEntries(os.map(o => [o.id, o.nombre]))
    setOsMap(osMapLocal)
    const enriquecidos = await Promise.all(
      ts.map(async t => {
        const paciente = await getPacienteByUserId(t.userId).catch(() => null)
        return { ...t, paciente }
      })
    )
    setPendientes(enriquecidos)
    setPendientesLoading(false)
  }

  async function handleAccion(turno, estado) {
    setActionLoading(turno.id + estado)
    try {
      await actualizarTurno(turno.id, { estado })
      toast({ message: estado === 'confirmado' ? 'Turno confirmado ✓' : 'Turno cancelado', type: estado === 'confirmado' ? 'success' : 'info' })
      setPendientes(prev => prev.filter(t => t.id !== turno.id))
      load()
    } catch {
      toast({ message: 'Error al actualizar', type: 'error' })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <Spinner className="h-64" />

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">{formatFechaLarga(new Date())}</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 text-sm text-[#1565C0] hover:underline shrink-0 mt-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={Calendar} label="Turnos hoy"      value={metricas.turnosHoy.length}        color="blue"   />
        <MetricCard icon={Clock}    label="Esta semana"     value={metricas.turnosSemana}            color="green"  />
        <MetricCard icon={Users}    label="Pacientes"       value={metricas.totalPacientes}          color="blue"   />
        <MetricCard icon={XCircle}  label="Cancelados mes"  value={metricas.turnosCanceladosMes}     color="red"    />
      </div>

      {metricas.turnosPendientes > 0 && (
        <button
          onClick={abrirPendientes}
          className="w-full bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 rounded-xl p-4 flex items-center gap-3 transition-colors text-left"
        >
          <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800 font-medium flex-1">
            {metricas.turnosPendientes} turno{metricas.turnosPendientes > 1 ? 's' : ''} pendiente{metricas.turnosPendientes > 1 ? 's' : ''} de confirmación — ver y gestionar
          </p>
          <ChevronRight className="w-4 h-4 text-yellow-500 shrink-0" />
        </button>
      )}

      <Card>
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Turnos de hoy</h2>
        </div>
        {turnosDetalle.length === 0 ? (
          <CardBody>
            <p className="text-gray-400 text-sm text-center py-6">No hay turnos para hoy</p>
          </CardBody>
        ) : (
          <div className="divide-y divide-gray-100">
            {turnosDetalle.map(t => (
              <div key={t.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {t.paciente?.fotoUrl ? (
                    <img src={t.paciente.fotoUrl} alt="" className="w-10 h-10 rounded-full border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#1565C0] font-semibold text-sm shrink-0">
                      {t.paciente?.nombre?.[0] ?? '?'}{t.paciente?.apellido?.[0] ?? ''}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {t.paciente?.nombre ?? 'Paciente'} {t.paciente?.apellido ?? ''}
                    </p>
                    <p className="text-xs text-gray-400">{formatHora(t.horaInicio)} – {formatHora(t.horaFin)}</p>
                  </div>
                </div>
                <Badge estado={t.estado} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modal turnos pendientes */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Turnos pendientes de confirmación" size="lg">
        {pendientesLoading ? (
          <Spinner className="h-48" />
        ) : pendientes.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
            <p className="text-gray-500 font-medium">Sin turnos pendientes</p>
            <p className="text-sm text-gray-400">Todos los turnos están gestionados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendientes.map(t => {
              const pac = t.paciente
              const fd = t.fecha?.toDate ? t.fecha.toDate() : null
              const telefonoLimpio = pac?.telefono?.replace(/\D/g, '')
              const waUrl = telefonoLimpio
                ? `https://wa.me/54${telefonoLimpio}?text=${encodeURIComponent(`Hola ${pac?.nombre || ''}! Te contactamos de FisioSalud para confirmar tu turno del ${fd ? formatFecha(fd) : ''} a las ${t.horaInicio}hs. ¿Podés confirmarlo?`)}`
                : null
              const obraSocial = pac?.obraSocialId ? osMap[pac.obraSocialId] : null

              return (
                <div key={t.id} className="border border-gray-200 rounded-2xl overflow-hidden">
                  {/* Header paciente */}
                  <div className="bg-gray-50 px-4 py-3 flex items-center gap-3">
                    {pac?.fotoUrl ? (
                      <img src={pac.fotoUrl} alt="" className="w-10 h-10 rounded-full border border-gray-200 shrink-0" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#1565C0] font-semibold shrink-0">
                        {pac?.nombre?.[0] ?? '?'}{pac?.apellido?.[0] ?? ''}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">
                        {pac?.nombre ?? '—'} {pac?.apellido ?? ''}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{pac?.email ?? ''}</p>
                    </div>
                    {obraSocial && (
                      <span className="text-xs bg-blue-50 text-blue-700 font-medium px-2 py-1 rounded-full shrink-0 flex items-center gap-1">
                        <Shield className="w-3 h-3" />{obraSocial}
                      </span>
                    )}
                    {!obraSocial && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full shrink-0">Particular</span>
                    )}
                  </div>

                  {/* Datos del turno */}
                  <div className="px-4 py-3 space-y-2">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Fecha y hora</p>
                        <p className="font-medium text-gray-800">
                          {fd ? formatFecha(fd) : '—'} · {t.horaInicio} – {t.horaFin}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-0.5">Teléfono</p>
                        {pac?.telefono ? (
                          <p className="font-medium text-gray-800">{pac.telefono}</p>
                        ) : (
                          <p className="text-gray-400 italic text-xs">Sin teléfono registrado</p>
                        )}
                      </div>
                      {pac?.dni && (
                        <div>
                          <p className="text-xs text-gray-400 mb-0.5">DNI</p>
                          <p className="font-medium text-gray-800">{pac.dni}</p>
                        </div>
                      )}
                      {t.notasPaciente && (
                        <div className="col-span-2">
                          <p className="text-xs text-gray-400 mb-0.5">Nota del paciente</p>
                          <p className="text-sm text-gray-600 italic">"{t.notasPaciente}"</p>
                        </div>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleAccion(t, 'confirmado')}
                        loading={actionLoading === t.id + 'confirmado'}
                        disabled={!!actionLoading}
                      >
                        <CheckCircle className="w-4 h-4" /> Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleAccion(t, 'cancelado')}
                        loading={actionLoading === t.id + 'cancelado'}
                        disabled={!!actionLoading}
                      >
                        <XCircle className="w-4 h-4" /> Cancelar
                      </Button>
                      {waUrl && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors border border-green-200"
                        >
                          <MessageCircle className="w-4 h-4" /> WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Modal>
    </div>
  )
}
