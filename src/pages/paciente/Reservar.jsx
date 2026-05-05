import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useDisponibilidad } from '../../hooks/useDisponibilidad'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Textarea } from '../../components/ui/Textarea'
import { Spinner } from '../../components/ui/Spinner'
import { crearTurno, getTurnoActivoPaciente, getSlotsByFecha } from '../../services/turnos.service'
import { isFechaBlocked } from '../../services/disponibilidad.service'
import { updateUserData } from '../../services/pacientes.service'
import { addMinutes, getDiaSemana, formatFechaLarga, generarSlots } from '../../utils'
import { ChevronLeft, ChevronRight, CheckCircle, AlertCircle, MessageCircle, CreditCard, Phone } from 'lucide-react'
import { WA_ADMIN as WA_NUMBER } from '../../constants'
import { Input } from '../../components/ui/Input'

function buildWaUrl(nombre, fecha, hora) {
  const msg = encodeURIComponent(
    `Hola! Reservé un turno en FisioSalud.\n\n` +
    `👤 Paciente: ${nombre}\n` +
    `📅 Fecha: ${fecha}\n` +
    `⏰ Horario: ${hora}\n\n` +
    `Adjunto mi pedido médico a este mensaje.`
  )
  return `https://wa.me/${WA_NUMBER}?text=${msg}`
}

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const TURNOS_FILTROS = [
  { label: 'Todos', value: 'todos' },
  { label: '🌅 Mañana', value: 'manana' },
  { label: '🌇 Tarde', value: 'tarde' },
]

// Helpers para verificar si un día tiene franjas de mañana o tarde
function hasFranjaManana(franjas) {
  return franjas?.some(f => parseInt(f.inicio.split(':')[0], 10) < 13) ?? false
}
function hasFranjaTarde(franjas) {
  return franjas?.some(f => parseInt(f.inicio.split(':')[0], 10) >= 13 ||
    parseInt(f.fin.split(':')[0], 10) > 13) ?? false
}

// Devuelve los próximos N slots disponibles con fecha y horario exacto
function getProximosSlots(disponibilidad, bloqueos, filtroHorario, duracionMin, cantidad = 3) {
  const result = []
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const d = new Date(hoy); d.setDate(d.getDate() + 1)
  const limite = new Date(hoy); limite.setDate(limite.getDate() + 90)
  while (result.length < cantidad && d < limite) {
    const ds = dateStr(d)
    if (!isFechaBlocked(ds, bloqueos)) {
      const dia = getDiaSemana(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12))
      const dispDia = disponibilidad[dia]
      if (dispDia?.activo && dispDia?.franjas?.length > 0) {
        const todos = generarSlots(dispDia.franjas, duracionMin, [])
        const filtrados = todos.filter(s => {
          const h = parseInt(s.split(':')[0], 10)
          if (filtroHorario === 'manana') return h < 13
          if (filtroHorario === 'tarde')  return h >= 13
          return true
        })
        for (const hora of filtrados) {
          if (result.length >= cantidad) break
          result.push({ fecha: ds, hora, fechaDate: new Date(d) })
        }
      }
    }
    d.setDate(d.getDate() + 1)
  }
  return result
}

function SlotPicker({ slots, value, onChange, filtroInicial = 'todos' }) {
  const [filtro, setFiltro] = useState(filtroInicial)

  const slotsFiltrados = slots.filter(slot => {
    const hora = parseInt(slot.split(':')[0], 10)
    if (filtro === 'manana') return hora < 13
    if (filtro === 'tarde') return hora >= 13
    return true
  })

  const hayManana = slots.some(s => parseInt(s.split(':')[0], 10) < 13)
  const hayTarde  = slots.some(s => parseInt(s.split(':')[0], 10) >= 13)

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="flex gap-2">
        {TURNOS_FILTROS.map(f => {
          const disabled = (f.value === 'manana' && !hayManana) || (f.value === 'tarde' && !hayTarde)
          return (
            <button
              key={f.value}
              disabled={disabled}
              onClick={() => { setFiltro(f.value); onChange('') }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                ${filtro === f.value
                  ? 'bg-[#1565C0] border-[#1565C0] text-white'
                  : disabled
                    ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                    : 'border-gray-200 text-gray-600 hover:border-[#1565C0] hover:text-[#1565C0]'}`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Slots */}
      {slotsFiltrados.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No hay turnos disponibles por la {filtro === 'manana' ? 'mañana' : 'tarde'}
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slotsFiltrados.map(slot => (
            <button
              key={slot}
              onClick={() => onChange(slot)}
              className={`py-2.5 rounded-xl border text-sm font-medium transition-colors
                ${value === slot
                  ? 'bg-[#1565C0] border-[#1565C0] text-white'
                  : 'border-gray-200 text-gray-700 hover:border-[#1565C0] hover:text-[#1565C0]'}`}
            >
              {slot}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function MesCalendar({ value, onChange, disponibilidad, bloqueos, filtroHorario = 'todos' }) {
  const [mes, setMes] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const diasMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate()
  const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1).getDay()
  const offset = primerDia === 0 ? 6 : primerDia - 1
  const DIAS_H = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  function isAvailable(day) {
    const d = new Date(mes.getFullYear(), mes.getMonth(), day)
    if (d < hoy) return false
    const ds = dateStr(d)
    if (isFechaBlocked(ds, bloqueos)) return false
    const dia = getDiaSemana(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12))
    const dispDia = disponibilidad[dia]
    if (!dispDia?.activo || !dispDia?.franjas?.length) return false
    if (filtroHorario === 'manana') return hasFranjaManana(dispDia.franjas)
    if (filtroHorario === 'tarde')  return hasFranjaTarde(dispDia.franjas)
    return true
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="font-semibold text-gray-700 capitalize">
          {mes.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => setMes(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DIAS_H.map((d, i) => <p key={i} className="text-center text-xs text-gray-400 py-1">{d}</p>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: diasMes }, (_, i) => i + 1).map(day => {
          const avail = isAvailable(day)
          const ds = dateStr(new Date(mes.getFullYear(), mes.getMonth(), day))
          const selected = value === ds
          return (
            <button
              key={day}
              disabled={!avail}
              onClick={() => onChange(ds)}
              className={`rounded-lg py-2 text-sm font-medium transition-colors
                ${selected ? 'bg-[#1565C0] text-white' : ''}
                ${avail && !selected ? 'hover:bg-blue-50 text-gray-700' : ''}
                ${!avail ? 'text-gray-300 cursor-not-allowed' : ''}
              `}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function Reservar() {
  const { user, userData } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const { disponibilidad, bloqueos, config, loading } = useDisponibilidad()

  const [step, setStep] = useState(1)
  const [filtroHorario, setFiltroHorario] = useState('todos')
  const [fechaSeleccionada, setFechaSeleccionada] = useState('')
  const [horaSeleccionada, setHoraSeleccionada] = useState('')
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [notas, setNotas] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [turnoActivo, setTurnoActivo] = useState(undefined)

  // Perfil incompleto
  const [perfilForm, setPerfilForm] = useState({ nombre: '', apellido: '', telefono: '' })
  const [savingPerfil, setSavingPerfil] = useState(false)

  // Restaurar estado guardado antes del login
  useEffect(() => {
    const saved = sessionStorage.getItem('reservar_state')
    if (saved) {
      try {
        const { fecha, hora, step: savedStep } = JSON.parse(saved)
        if (fecha) setFechaSeleccionada(fecha)
        if (hora)  setHoraSeleccionada(hora)
        if (savedStep) setStep(savedStep)
      } catch {}
      sessionStorage.removeItem('reservar_state')
    }
  }, [])

  useEffect(() => {
    if (userData) {
      setPerfilForm({
        nombre: userData.nombre || '',
        apellido: userData.apellido || '',
        telefono: userData.telefono || '',
      })
    }
  }, [userData])

  useEffect(() => {
    if (!user) { setTurnoActivo(null); return }
    getTurnoActivoPaciente(user.uid).then(t => setTurnoActivo(t))
  }, [user])

  useEffect(() => {
    if (!fechaSeleccionada || !config) return
    setSlotsLoading(true)
    getSlotsByFecha(fechaSeleccionada, disponibilidad, config.duracionSesionMin || 45, bloqueos)
      .then(s => { setSlots(s); setSlotsLoading(false) })
  }, [fechaSeleccionada, disponibilidad, config, bloqueos])

  function handleIrALogin() {
    sessionStorage.setItem('reservar_state', JSON.stringify({
      fecha: fechaSeleccionada,
      hora: horaSeleccionada,
      step,
    }))
    navigate('/auth/login?redirect=/paciente/reservar')
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const existente = await getTurnoActivoPaciente(user.uid)
      if (existente) { toast({ message: 'Ya tenés un turno activo', type: 'error' }); return }
      const horaFin = addMinutes(horaSeleccionada, config?.duracionSesionMin || 45)
      await crearTurno({
        userId: user.uid,
        pacienteId: user.uid,
        fecha: fechaSeleccionada,
        horaInicio: horaSeleccionada,
        horaFin,
        pedidoMedicoUrl: '',
        notasPaciente: notas,
      })
      setStep(4)
    } catch {
      toast({ message: 'Error al crear el turno', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSavePerfil() {
    if (!perfilForm.telefono.trim()) {
      toast({ message: 'El teléfono es obligatorio', type: 'error' }); return
    }
    setSavingPerfil(true)
    try {
      await updateUserData(user.uid, perfilForm)
      toast({ message: 'Datos guardados', type: 'success' })
    } catch {
      toast({ message: 'Error al guardar', type: 'error' })
    } finally {
      setSavingPerfil(false)
    }
  }

  if (loading || turnoActivo === undefined) return <Spinner className="h-64" />

  // Si el paciente está logueado pero le falta el teléfono, pedir antes de reservar
  if (user && userData && !userData.telefono) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Phone className="w-6 h-6 text-[#1565C0]" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Antes de reservar</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                El kinesiólogo se comunicará con vos para confirmar el turno
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800">
            Necesitamos tu número de teléfono para que <strong>Lic. Miguel Carrizo</strong> pueda contactarte por WhatsApp y coordinar tu turno.
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nombre"
                value={perfilForm.nombre}
                onChange={e => setPerfilForm(p => ({ ...p, nombre: e.target.value }))}
              />
              <Input
                label="Apellido"
                value={perfilForm.apellido}
                onChange={e => setPerfilForm(p => ({ ...p, apellido: e.target.value }))}
              />
            </div>
            <Input
              label="Teléfono (WhatsApp) *"
              placeholder="Ej: 3804123456"
              value={perfilForm.telefono}
              onChange={e => setPerfilForm(p => ({ ...p, telefono: e.target.value }))}
              type="tel"
            />
            <p className="text-xs text-gray-400">Sin el 0 ni el 15. Solo el número local.</p>
          </div>

          <Button className="w-full" onClick={handleSavePerfil} loading={savingPerfil}>
            Guardar y continuar
          </Button>
        </div>
      </div>
    )
  }

  if (turnoActivo) {
    const fecha = turnoActivo.fecha?.toDate ? turnoActivo.fecha.toDate() : null
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <h2 className="font-semibold text-gray-800">Ya tenés un turno activo</h2>
          <p className="text-sm text-gray-600">
            Turno {turnoActivo.estado} para el{' '}
            {fecha ? formatFechaLarga(fecha) : ''} a las {turnoActivo.horaInicio}.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left">
            <p className="font-semibold mb-1">Solo se permite 1 turno por paciente a la vez</p>
            <p className="text-xs text-amber-700">Para coordinar un nuevo turno, contactate con el especialista:</p>
            <a
              href={`https://wa.me/543804362882?text=${encodeURIComponent('Hola! Necesito coordinar un nuevo turno.')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 mt-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Contactar al especialista
            </a>
          </div>
          <Button variant="outline" onClick={() => navigate('/paciente/mis-turnos')}>
            Ver mis turnos
          </Button>
        </div>
      </div>
    )
  }

  // Step 4 — Confirmación
  if (step === 4) {
    const nombrePaciente = userData?.nombre
      ? `${userData.nombre} ${userData.apellido || ''}`
      : user?.displayName || ''
    const fechaLabel = formatFechaLarga(new Date(fechaSeleccionada + 'T12:00:00'))
    const waUrl = buildWaUrl(nombrePaciente.trim(), fechaLabel, horaSeleccionada)

    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-5">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">¡Turno reservado!</h2>
          <p className="text-sm text-gray-500 mt-2">
            <strong>{fechaLabel}</strong> · <strong>{horaSeleccionada}</strong>
          </p>
          <p className="text-xs text-gray-400 mt-1">El profesional confirmará tu turno a la brevedad.</p>
        </div>

        {/* Pedido médico por WhatsApp */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-left space-y-2">
          <p className="text-sm font-semibold text-green-800">Enviá tu pedido médico</p>
          <p className="text-xs text-green-700">Adjuntá la foto de tu pedido médico al mensaje de WhatsApp.</p>
          <a href={waUrl} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors">
            <MessageCircle className="w-4 h-4" /> Enviar pedido por WhatsApp
          </a>
        </div>

        {/* MercadoPago / transferencia */}
        {config?.mpAlias && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-semibold text-blue-800">Abonás por transferencia / MercadoPago</p>
            </div>
            <p className="text-sm text-blue-700">Alias: <strong>{config.mpAlias}</strong>{config.mpTitular ? ` · ${config.mpTitular}` : ''}</p>
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Hola! Te envío el comprobante de pago de mi turno del ${fechaLabel} a las ${horaSeleccionada}hs.`)}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm text-green-600 hover:underline"
            >
              <MessageCircle className="w-4 h-4" /> Enviar comprobante de pago
            </a>
          </div>
        )}

        <Button variant="outline" onClick={() => navigate('/paciente/mis-turnos')}>
          Ver mis turnos
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Recordatorio ropa cómoda */}
      <div className="bg-orange-500 text-white rounded-2xl px-5 py-4 flex items-center gap-3 shadow-sm">
        <span className="text-2xl shrink-0">👕</span>
        <p className="text-sm font-semibold leading-snug">
          ¡No te olvides de venir con ropa cómoda!<br />
          <span className="font-normal text-orange-100">Remera, calza, jogging o ropa deportiva</span>
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                ${step >= s ? 'bg-[#1565C0] text-white' : 'bg-gray-100 text-gray-400'}`}>
                {s}
              </div>
              {s < 3 && <div className={`h-0.5 w-8 ${step > s ? 'bg-[#1565C0]' : 'bg-gray-200'}`} />}
            </div>
          ))}
          <span className="ml-2 text-sm text-gray-500">
            {step === 1 && 'Elegí un día'}
            {step === 2 && 'Elegí un horario'}
            {step === 3 && 'Confirmá tu turno'}
          </span>
        </div>

        {/* Step 1: Fecha */}
        {step === 1 && (
          <div className="space-y-4">

            {/* Filtro mañana/tarde — centrado */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-gray-400">Filtrar por horario</p>
              <div className="flex gap-2">
                {TURNOS_FILTROS.map(f => (
                  <button
                    key={f.value}
                    onClick={() => { setFiltroHorario(f.value); setFechaSeleccionada(''); setHoraSeleccionada('') }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                      ${filtroHorario === f.value
                        ? 'bg-[#1565C0] border-[#1565C0] text-white'
                        : 'border-gray-200 text-gray-600 hover:border-[#1565C0] hover:text-[#1565C0]'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendario */}
            <MesCalendar
              value={fechaSeleccionada}
              onChange={ds => { setFechaSeleccionada(ds); setHoraSeleccionada('') }}
              disponibilidad={disponibilidad}
              bloqueos={bloqueos}
              filtroHorario={filtroHorario}
            />
            <Button className="w-full" disabled={!fechaSeleccionada} onClick={() => setStep(2)}>
              Continuar
            </Button>

            {/* Próximos turnos disponibles — acceso rápido */}
            {!loading && (() => {
              const proximos = getProximosSlots(disponibilidad, bloqueos, filtroHorario, config?.duracionSesionMin || 45, 3)
              if (proximos.length === 0) return null
              return (
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-3 text-center uppercase tracking-wide">
                    Próximos turnos disponibles
                  </p>
                  <div className="space-y-2">
                    {proximos.map((s, i) => {
                      const label = s.fechaDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
                      const hora12 = (() => {
                        const [h, m] = s.hora.split(':').map(Number)
                        const ampm = h < 12 ? 'am' : 'pm'
                        const h12 = h % 12 || 12
                        return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
                      })()
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setFechaSeleccionada(s.fecha)
                            setHoraSeleccionada(s.hora)
                            setStep(3)
                          }}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 hover:border-[#1565C0] hover:bg-blue-50 transition-colors text-left group"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-800 capitalize">{label}</p>
                            <p className="text-xs text-gray-400">{hora12}</p>
                          </div>
                          <span className="text-xs text-[#1565C0] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            Reservar →
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* Step 2: Horario */}
        {step === 2 && (
          <div className="space-y-4">
            <button onClick={() => { setStep(1); setHoraSeleccionada('') }} className="text-sm text-gray-400 hover:text-gray-600">
              ← Cambiar fecha
            </button>
            <p className="font-medium text-gray-700">{formatFechaLarga(new Date(fechaSeleccionada + 'T12:00:00'))}</p>
            {slotsLoading ? <Spinner className="h-24" /> : (
              slots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm">No hay turnos disponibles para este día</p>
                  <button onClick={() => setStep(1)} className="text-sm text-[#1565C0] hover:underline mt-2">Elegir otro día</button>
                </div>
              ) : (
                <SlotPicker slots={slots} value={horaSeleccionada} onChange={setHoraSeleccionada} filtroInicial={filtroHorario} />
              )
            )}
            <Button className="w-full" disabled={!horaSeleccionada} onClick={() => setStep(3)}>
              Continuar
            </Button>
          </div>
        )}

        {/* Step 3: Confirmar */}
        {step === 3 && (
          <div className="space-y-4">
            <button onClick={() => setStep(2)} className="text-sm text-gray-400 hover:text-gray-600">
              ← Cambiar horario
            </button>

            <div className="bg-blue-50 rounded-xl p-4 space-y-1 text-sm">
              <p><span className="text-gray-500">Fecha:</span> <strong>{formatFechaLarga(new Date(fechaSeleccionada + 'T12:00:00'))}</strong></p>
              <p><span className="text-gray-500">Horario:</span> <strong>{horaSeleccionada} – {addMinutes(horaSeleccionada, config?.duracionSesionMin || 45)}</strong></p>
              <p><span className="text-gray-500">Paciente:</span> <strong>{userData?.nombre ? `${userData.nombre} ${userData.apellido || ''}` : user?.displayName}</strong></p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-2">
              <p className="font-medium">Recordá</p>
              <ul className="text-xs text-amber-700 space-y-1 list-none">
                <li>📋 Luego de confirmar, te vamos a dar un botón para enviar el pedido médico por WhatsApp al <strong>3804362882</strong>.</li>
                <li>⏰ Respetar el horario del turno (tolerancia máxima 10 minutos)</li>
                <li>👕 Venir con ropa cómoda: remera, calza, jogging o ropa deportiva</li>
              </ul>
            </div>

            <Textarea
              label="Notas adicionales (opcional)"
              placeholder="Contanos algo sobre tu lesión o consulta..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
            />

            {user ? (
              <Button className="w-full" onClick={handleSubmit} loading={submitting}>
                Confirmar turno
              </Button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleIrALogin}
                  className="block w-full text-center bg-[#1565C0] hover:bg-[#1256a8] text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Iniciar sesión para confirmar
                </button>
                <p className="text-xs text-center text-gray-400">Necesitás una cuenta de Google para reservar</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
