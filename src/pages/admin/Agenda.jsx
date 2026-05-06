import { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2, MessageCircle, Printer, RefreshCw, Search, CalendarDays, LayoutGrid, Clock, Phone, Star } from 'lucide-react'
import { FERIADOS_ARGENTINA_2025 } from '../../constants'
import { getConfig } from '../../services/config.service'
import { Card, CardBody } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Textarea } from '../../components/ui/Textarea'
import { Spinner } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'
import {
  getTurnosRango, getTurnosByFecha, actualizarTurno,
  proponerReprogramacion, getTurnosCanceladosPorPaciente, getSlotsByFecha,
} from '../../services/turnos.service'
import { getBloqueos, addBloqueo, deleteBloqueo } from '../../services/disponibilidad.service'
import { getPacientesByIds } from '../../services/pacientes.service'
import { useConfig } from '../../hooks/useConfig'
import { useDisponibilidad } from '../../hooks/useDisponibilidad'
import { generarSlots, formatFecha, formatFechaLarga, addMinutes, getDiaSemana } from '../../utils'

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function getWeekDates(refDate) {
  const d = new Date(refDate)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return Array.from({ length: 6 }, (_, i) => { const nd = new Date(d); nd.setDate(d.getDate() + i); return nd })
}

function dateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function imprimirReporte(turnos, fecha, pacientesMap) {
  const dateLabel = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const rows = turnos.map(t => {
    const p = pacientesMap[t.userId] || {}
    const estadoLabels = { pendiente:'Pendiente', confirmado:'Confirmado', completado:'Completado', cancelado:'Cancelado' }
    return `<tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:10px 14px;font-weight:700;color:#1565C0">${t.horaInicio}</td>
      <td style="padding:10px 14px">${p.nombre || ''} ${p.apellido || ''}</td>
      <td style="padding:10px 14px;color:#64748b">${p.telefono || '—'}</td>
      <td style="padding:10px 14px"><span style="background:${t.estado==='completado'?'#dcfce7':t.estado==='confirmado'?'#dbeafe':t.estado==='cancelado'?'#fee2e2':'#fef9c3'};padding:3px 10px;border-radius:99px;font-size:12px">${estadoLabels[t.estado]||t.estado}</span></td>
      <td style="padding:10px 14px;color:#94a3b8;font-size:13px">${t.notasAdmin || '—'}</td>
    </tr>`
  }).join('')
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Agenda ${dateLabel}</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:32px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:2px solid #1565C0}
  h1{font-size:22px;color:#1565C0;font-weight:700}p{font-size:13px;color:#64748b;margin-top:4px}
  .meta{text-align:right;font-size:13px;color:#64748b}.meta strong{display:block;font-size:16px;color:#1e293b}
  table{width:100%;border-collapse:collapse}thead tr{background:#1565C0}th{padding:12px 14px;text-align:left;color:white;font-size:13px;font-weight:600}
  tbody tr:nth-child(even){background:#f8fafc}.footer{margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;text-align:center}
  @media print{body{padding:16px}}</style></head><body>
  <div class="header"><div><h1>FisioSalud</h1><p>Lic. Miguel Carrizo · Rehabilitación Traumatológica y Deportiva</p><p>Avellaneda 112, La Rioja · 3804362882</p></div>
  <div class="meta"><strong>Agenda del día</strong>${dateLabel}<br/><br/>Total: ${turnos.length} turno${turnos.length!==1?'s':''}</div></div>
  <table><thead><tr><th>Horario</th><th>Paciente</th><th>Teléfono</th><th>Estado</th><th>Notas</th></tr></thead>
  <tbody>${rows||'<tr><td colspan="5" style="padding:20px;text-align:center;color:#94a3b8">Sin turnos para este día</td></tr>'}</tbody></table>
  <div class="footer">Generado el ${new Date().toLocaleDateString('es-AR')} · FisioSalud</div>
  </body></html>`
  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(html); win.document.close()
  setTimeout(() => win.print(), 600)
}

// Slot picker simple para el modal de propuesta (sin filtros mañana/tarde)
function AdminSlotPicker({ slots, value, onChange }) {
  if (!slots.length) return <p className="text-sm text-gray-400 text-center py-4">Sin cupos disponibles para esta fecha</p>
  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map(slot => (
        <button
          key={slot.hora}
          onClick={() => onChange(slot.hora)}
          className={`py-2 rounded-xl border text-sm font-medium transition-colors flex flex-col items-center gap-0.5
            ${value === slot.hora ? 'bg-[#1565C0] border-[#1565C0] text-white' : 'border-gray-200 text-gray-700 hover:border-[#1565C0] hover:text-[#1565C0]'}`}
        >
          <span>{slot.hora}</span>
          {slot.capacidad > 1 && (
            <span className={`text-[10px] font-normal ${value === slot.hora ? 'text-blue-100' : 'text-gray-400'}`}>
              {slot.disponibles} lugar{slot.disponibles !== 1 ? 'es' : ''}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export default function Agenda() {
  const toast = useToast()
  const { config } = useConfig()
  const { disponibilidad, bloqueos: dispBloqueos } = useDisponibilidad()

  const [viewMode, setViewMode] = useState('week') // 'week' | 'day'
  const [weekRef, setWeekRef] = useState(new Date())
  const [turnos, setTurnos] = useState([])
  const [pacientes, setPacientes] = useState({})
  const [bloqueos, setBloqueos] = useState([])
  const [canceladosPaciente, setCanceladosPaciente] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [selectedTurno, setSelectedTurno] = useState(null)
  const [notasAdmin, setNotasAdmin] = useState('')
  const [notasEvolucion, setNotasEvolucion] = useState('')
  const [savingStatus, setSavingStatus] = useState(false)
  const [pendingEstado, setPendingEstado] = useState(null)
  const [mensajeRecordatorio, setMensajeRecordatorio] = useState('')

  const [bloqueoModal, setBloqueoModal] = useState(false)
  const [bloqueoForm, setBloqueoForm] = useState({ fecha: '', motivo: '', tipo: 'dia_completo', franjaInicio: '', franjaFin: '' })

  const [propuestaModal, setPropuestaModal] = useState(null)
  const [propuestaForm, setPropuestaForm] = useState({ fecha: '', horaInicio: '' })
  const [propuestaSlots, setPropuestaSlots] = useState([])
  const [propuestaSlotsLoading, setPropuestaSlotsLoading] = useState(false)
  const [savingPropuesta, setSavingPropuesta] = useState(false)

  const [printDate, setPrintDate] = useState(dateStr(new Date()))

  const dates = getWeekDates(weekRef)
  const duracionMin = config?.duracionSesionMin || 30

  useEffect(() => {
    getConfig().then(c => { if (c?.mensajeRecordatorio) setMensajeRecordatorio(c.mensajeRecordatorio) })
  }, [])

  async function load() {
    setLoading(true)
    const [ts, bl, cancelados] = await Promise.all([
      getTurnosRango(dates[0], dates[dates.length - 1]),
      getBloqueos(),
      getTurnosCanceladosPorPaciente(),
    ])
    setTurnos(ts); setBloqueos(bl); setCanceladosPaciente(cancelados)

    // Batch patient reads (#21)
    const ids = [...new Set([...ts.map(t => t.userId), ...cancelados.map(t => t.userId)])]
    const pacientesList = await getPacientesByIds(ids)
    setPacientes(Object.fromEntries(pacientesList.map(p => [p.id, p])))
    setLoading(false)
  }

  useEffect(() => { load() }, [weekRef])

  // Load slots for propuesta when date changes (#5, #19)
  useEffect(() => {
    if (!propuestaForm.fecha || !config || !Object.keys(disponibilidad).length) return
    setPropuestaSlotsLoading(true)
    setPropuestaForm(p => ({ ...p, horaInicio: '' }))
    getSlotsByFecha(propuestaForm.fecha, disponibilidad, duracionMin, dispBloqueos)
      .then(s => { setPropuestaSlots(s); setPropuestaSlotsLoading(false) })
  }, [propuestaForm.fecha, disponibilidad, config, dispBloqueos])

  function turnosParaDia(date) {
    const ds = dateStr(date)
    return turnos.filter(t => {
      const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
      if (dateStr(fd) !== ds) return false
      if (!search) return true
      const p = pacientes[t.userId]
      const nombre = `${p?.nombre || ''} ${p?.apellido || ''}`.toLowerCase()
      return nombre.includes(search.toLowerCase())
    })
  }

  function isDiaBlocked(date) {
    const ds = dateStr(date)
    return bloqueos.some(b => {
      const bd = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha)
      return dateStr(bd) === ds && b.tipo === 'dia_completo'
    })
  }

  // Cupos totales vs ocupados por día (#18)
  function cuposInfo(date) {
    const ds = dateStr(date)
    const dia = getDiaSemana(new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12))
    const dispDia = disponibilidad[dia]
    if (!dispDia?.activo || !dispDia?.franjas?.length) return null
    const totalCapacidad = generarSlots(dispDia.franjas, duracionMin, {}).reduce((sum, s) => sum + s.capacidad, 0)
    const ocupados = turnos.filter(t => {
      const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
      return dateStr(fd) === ds && t.estado !== 'cancelado'
    }).length
    return { total: totalCapacidad, ocupados, libres: Math.max(0, totalCapacidad - ocupados) }
  }

  function openTurno(t) { setSelectedTurno(t); setNotasAdmin(t.notasAdmin || ''); setNotasEvolucion(''); setPendingEstado(null) }

  async function cambiarEstado(estado) {
    setSavingStatus(true)
    try {
      const extra = estado === 'completado' && notasEvolucion.trim()
        ? { notasEvolucion: notasEvolucion.trim() }
        : {}
      await actualizarTurno(selectedTurno.id, { estado, notasAdmin, ...extra })
      toast({ message: `Turno marcado como ${estado}`, type: 'success' })
      setSelectedTurno(null); setPendingEstado(null); setNotasEvolucion(''); load()
    } catch { toast({ message: 'Error al actualizar', type: 'error' }) }
    finally { setSavingStatus(false) }
  }

  async function handleAddBloqueo() {
    if (!bloqueoForm.fecha) { toast({ message: 'Seleccioná una fecha', type: 'error' }); return }
    if (bloqueoForm.tipo === 'franja' && (!bloqueoForm.franjaInicio || !bloqueoForm.franjaFin)) {
      toast({ message: 'Ingresá el horario de inicio y fin de la franja', type: 'error' }); return
    }
    await addBloqueo(bloqueoForm)
    toast({ message: bloqueoForm.tipo === 'franja' ? 'Franja bloqueada' : 'Día bloqueado', type: 'success' })
    setBloqueoModal(false)
    setBloqueoForm({ fecha: '', motivo: '', tipo: 'dia_completo', franjaInicio: '', franjaFin: '' })
    load()
  }

  async function cargarFeriados() {
    const hoy = new Date(); hoy.setHours(0,0,0,0)
    const pendientes = FERIADOS_ARGENTINA_2025.filter(f => new Date(f.fecha + 'T12:00:00') >= hoy)
    if (pendientes.length === 0) { toast({ message: 'No hay feriados pendientes para cargar', type: 'info' }); return }
    await Promise.all(pendientes.map(f => addBloqueo({ fecha: f.fecha, motivo: f.motivo, tipo: 'dia_completo' })))
    toast({ message: `${pendientes.length} feriados cargados`, type: 'success' })
    load()
  }

  async function handleDeleteBloqueo(id) {
    await deleteBloqueo(id)
    toast({ message: 'Bloqueo eliminado', type: 'success' }); load()
  }

  async function handlePropuesta() {
    if (!propuestaForm.fecha || !propuestaForm.horaInicio) {
      toast({ message: 'Elegí una fecha y un horario', type: 'error' }); return
    }
    setSavingPropuesta(true)
    try {
      const horaFin = addMinutes(propuestaForm.horaInicio, duracionMin)
      await proponerReprogramacion(propuestaModal.id, {
        userId: propuestaModal.userId,
        pacienteId: propuestaModal.pacienteId,
        fecha: propuestaForm.fecha,
        horaInicio: propuestaForm.horaInicio,
        horaFin,
      })
      toast({ message: 'Propuesta enviada al paciente', type: 'success' })
      setPropuestaModal(null); setPropuestaForm({ fecha: '', horaInicio: '' }); load()
    } catch { toast({ message: 'Error al proponer', type: 'error' }) }
    finally { setSavingPropuesta(false) }
  }

  async function handlePrint() {
    const fecha = new Date(printDate + 'T12:00:00')
    const ts = await getTurnosByFecha(fecha)
    imprimirReporte(ts.filter(t => t.estado !== 'cancelado'), printDate, pacientes)
  }

  // Vista del día actual — turnos de hoy ordenados (#16)
  const hoyStr = dateStr(new Date())
  const turnosHoy = useMemo(() => {
    return turnos
      .filter(t => {
        const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
        if (dateStr(fd) !== hoyStr) return false
        if (!search) return true
        const p = pacientes[t.userId]
        return `${p?.nombre || ''} ${p?.apellido || ''}`.toLowerCase().includes(search.toLowerCase())
      })
      .sort((a, b) => (a.horaInicio || '').localeCompare(b.horaInicio || ''))
  }, [turnos, pacientes, search, hoyStr])

  const pac = selectedTurno ? pacientes[selectedTurno.userId] : null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Agenda</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Vista toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${viewMode === 'week' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Semana
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                ${viewMode === 'day' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CalendarDays className="w-4 h-4" /> Hoy
            </button>
          </div>

          {/* Imprimir */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <Printer className="w-4 h-4 text-gray-400" />
            <input type="date" value={printDate} onChange={e => setPrintDate(e.target.value)}
              className="text-sm border-0 outline-none text-gray-700" />
            <button onClick={handlePrint} className="text-sm text-[#1565C0] hover:underline font-medium">Imprimir</button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setBloqueoModal(true)}>
            <Plus className="w-4 h-4" /> Bloquear
          </Button>
          <Button variant="outline" size="sm" onClick={cargarFeriados}>
            <Star className="w-4 h-4" /> Feriados 2025
          </Button>
        </div>
      </div>

      {/* Buscar paciente (#30) */}
      <div className="relative max-w-xs">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Buscar paciente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
        )}
      </div>

      {/* Cancelados por pacientes */}
      {canceladosPaciente.length > 0 && (
        <Card>
          <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-orange-500" />
            <p className="text-sm font-medium text-gray-700">Cancelados por paciente — pendientes de reprogramación</p>
            <span className="ml-auto bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">{canceladosPaciente.length}</span>
          </div>
          <CardBody className="py-3">
            <div className="flex flex-col gap-2">
              {canceladosPaciente.map(t => {
                const p = pacientes[t.userId]
                const fd = t.fecha?.toDate ? t.fecha.toDate() : null
                return (
                  <div key={t.id} className="flex items-center justify-between gap-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-medium text-sm text-gray-800">{p?.nombre} {p?.apellido}</p>
                      <p className="text-xs text-gray-500">{fd ? formatFecha(fd) : ''} · {t.horaInicio}hs</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setPropuestaModal(t); setPropuestaForm({ fecha: '', horaInicio: '' }); setPropuestaSlots([]) }}>
                      <RefreshCw className="w-3.5 h-3.5" /> Reprogramar
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Bloqueos vigentes */}
      {bloqueos.length > 0 && (
        <Card>
          <div className="px-6 py-3 border-b border-gray-100"><p className="text-sm font-medium text-gray-600">Días bloqueados</p></div>
          <CardBody className="py-3">
            <div className="flex flex-wrap gap-2">
              {bloqueos.map(b => {
                const bd = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha)
                return (
                  <div key={b.id} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-sm text-red-700">
                    <span>{formatFecha(bd)}</span>
                    {b.motivo && <span className="text-red-400">· {b.motivo}</span>}
                    <button onClick={() => handleDeleteBloqueo(b.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ====== VISTA SEMANA ====== */}
      {viewMode === 'week' && (
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekRef(d => { const nd = new Date(d); nd.setDate(nd.getDate()-7); return nd })} className="p-2 rounded-lg hover:bg-gray-100 border border-gray-200">
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm font-medium text-gray-700">{formatFecha(dates[0])} – {formatFecha(dates[5])}</span>
            <button onClick={() => setWeekRef(d => { const nd = new Date(d); nd.setDate(nd.getDate()+7); return nd })} className="p-2 rounded-lg hover:bg-gray-100 border border-gray-200">
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
            <button onClick={() => setWeekRef(new Date())} className="text-sm text-[#1565C0] hover:underline ml-2">Hoy</button>
          </div>

          {loading ? <Spinner className="h-48" /> : (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {dates.map((date, i) => {
                const ts = turnosParaDia(date)
                const blocked = isDiaBlocked(date)
                const isToday = dateStr(date) === hoyStr
                const cupos = !blocked ? cuposInfo(date) : null
                return (
                  <div key={i} className={`rounded-xl border min-h-[120px] ${blocked ? 'bg-red-50 border-red-200' : isToday ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200'}`}>
                    <div className={`px-3 py-2 text-center border-b ${blocked ? 'border-red-200' : isToday ? 'border-blue-300' : 'border-gray-100'}`}>
                      <p className="text-xs text-gray-400">{DIAS[i]}</p>
                      <p className={`text-lg font-bold ${isToday ? 'text-[#1565C0]' : 'text-gray-700'}`}>{date.getDate()}</p>
                      {/* Cupos info (#18) */}
                      {cupos && (
                        <p className={`text-[10px] font-medium mt-0.5 ${cupos.libres === 0 ? 'text-red-400' : 'text-green-600'}`}>
                          {cupos.libres}/{cupos.total} libres
                        </p>
                      )}
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                      {blocked && <p className="text-xs text-red-500 text-center">Bloqueado</p>}
                      {ts.map(t => {
                        const p = pacientes[t.userId]
                        return (
                          <button key={t.id} onClick={() => openTurno(t)}
                            className="w-full text-left rounded-lg p-1.5 bg-white border border-gray-200 hover:border-[#1565C0] transition-colors shadow-sm">
                            <p className="text-xs font-medium text-gray-700 truncate">{p?.nombre} {p?.apellido?.[0]}.</p>
                            <p className="text-xs text-gray-400">{t.horaInicio}</p>
                            <Badge estado={t.estado} className="text-[10px] mt-0.5 py-0" />
                          </button>
                        )
                      })}
                      {ts.length === 0 && !blocked && <p className="text-xs text-gray-300 text-center pt-2">—</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ====== VISTA DÍA — Timeline (#16) ====== */}
      {viewMode === 'day' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#1565C0]" />
            <h2 className="font-semibold text-gray-700 capitalize">
              {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <span className="ml-auto text-sm text-gray-400">{turnosHoy.length} turno{turnosHoy.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? <Spinner className="h-48" /> : turnosHoy.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-gray-400">Sin turnos para hoy{search ? ' (filtro activo)' : ''}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {turnosHoy.map(t => {
                const p = pacientes[t.userId]
                return (
                  <button
                    key={t.id}
                    onClick={() => openTurno(t)}
                    className="w-full bg-white border border-gray-100 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-[#1565C0] transition-colors shadow-sm text-left"
                  >
                    <div className="w-16 shrink-0 text-center">
                      <p className="text-lg font-bold text-[#1565C0]">{t.horaInicio}</p>
                      <p className="text-xs text-gray-400">– {t.horaFin}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800">{p?.nombre} {p?.apellido}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {p?.telefono && (
                          <a
                            href={`tel:${p.telefono}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#1565C0]"
                          >
                            <Phone className="w-3 h-3" />{p.telefono}
                          </a>
                        )}
                        {p?.telefono && (
                          <a
                            href={`https://wa.me/54${p.telefono.replace(/\D/g,'')}?text=${encodeURIComponent((mensajeRecordatorio || '¡Hola {{nombre}}! Tu turno en FisioSalud es hoy a las {{hora}}hs. ¡Te esperamos!').replace('{{nombre}}', p?.nombre || '').replace('{{fecha}}', 'hoy').replace('{{hora}}', t.horaInicio))}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-green-600 hover:underline"
                          >
                            <MessageCircle className="w-3 h-3" /> WA
                          </a>
                        )}
                      </div>
                    </div>
                    <Badge estado={t.estado} />
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Turno detail modal */}
      <Modal open={!!selectedTurno} onClose={() => { setSelectedTurno(null); setPendingEstado(null) }} title="Detalle del turno" size="md">
        {selectedTurno && !pendingEstado && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-[#1565C0] font-bold text-lg">
                  {pac?.nombre?.[0]}{pac?.apellido?.[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{pac?.nombre} {pac?.apellido}</p>
                  <p className="text-sm text-gray-500">DNI: {pac?.dni || '—'} · {pac?.telefono || '—'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-400 text-xs">Fecha</span><p className="font-medium">{selectedTurno.fecha ? formatFecha(selectedTurno.fecha.toDate()) : ''}</p></div>
                <div><span className="text-gray-400 text-xs">Horario</span><p className="font-medium">{selectedTurno.horaInicio} – {selectedTurno.horaFin}</p></div>
                <div><span className="text-gray-400 text-xs">Estado</span><div className="mt-0.5"><Badge estado={selectedTurno.estado} /></div></div>
                {pac?.clinica?.sesionesIndicadas > 0 && (
                  <div><span className="text-gray-400 text-xs">Sesiones</span><p className="font-medium">{pac?.clinica?.sesionesCompletadas} / {pac?.clinica?.sesionesIndicadas}</p></div>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {selectedTurno.pedidoMedicoUrl && (
                  <a href={selectedTurno.pedidoMedicoUrl} target="_blank" rel="noreferrer" className="text-sm text-[#1565C0] hover:underline">
                    Ver pedido médico ↗
                  </a>
                )}
                {pac?.telefono && (
                  <a href={`https://wa.me/54${pac.telefono.replace(/\D/g,'')}?text=${encodeURIComponent((mensajeRecordatorio || '¡Hola {{nombre}}! Te recordamos tu turno en FisioSalud el {{fecha}} a las {{hora}}hs. ¡Te esperamos!').replace('{{nombre}}', pac?.nombre || '').replace('{{fecha}}', selectedTurno.fecha ? formatFecha(selectedTurno.fecha.toDate()) : '').replace('{{hora}}', selectedTurno.horaInicio))}`}
                    target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:underline">
                    <MessageCircle className="w-4 h-4" /> Recordatorio WhatsApp
                  </a>
                )}
              </div>
            </div>
            <Textarea label="Notas internas" placeholder="Observaciones del turno..." value={notasAdmin} onChange={e => setNotasAdmin(e.target.value)} rows={2} />
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedTurno.estado === 'pendiente' && (
                <Button size="sm" onClick={() => cambiarEstado('confirmado')} loading={savingStatus}>Confirmar</Button>
              )}
              {['pendiente', 'confirmado'].includes(selectedTurno.estado) && (
                <>
                  <Button size="sm" variant="secondary" onClick={() => setPendingEstado({ estado: 'completado', label: 'Marcar como completado' })} loading={savingStatus}>
                    Completado
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setPendingEstado({ estado: 'cancelado', label: 'Cancelar este turno' })} loading={savingStatus}>
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Confirmación de acción crítica + notas de evolución */}
        {selectedTurno && pendingEstado && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 text-sm ${pendingEstado.estado === 'cancelado' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>
              <p className="font-semibold mb-1">{pendingEstado.label}</p>
              <p>
                Turno de <strong>{pac?.nombre} {pac?.apellido}</strong> el{' '}
                <strong>{selectedTurno.fecha ? formatFecha(selectedTurno.fecha.toDate()) : ''}</strong> a las{' '}
                <strong>{selectedTurno.horaInicio}hs</strong>.
              </p>
            </div>
            {pendingEstado.estado === 'completado' && (
              <div>
                <Textarea
                  label="Notas de evolución (opcional)"
                  placeholder="Ej: Buena movilidad. Se indicó continuar con ejercicios de propiocepción..."
                  value={notasEvolucion}
                  onChange={e => setNotasEvolucion(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-gray-400 mt-1">Se guardará en el historial del paciente.</p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant={pendingEstado.estado === 'cancelado' ? 'danger' : 'secondary'}
                loading={savingStatus}
                onClick={() => cambiarEstado(pendingEstado.estado)}
                className="flex-1"
              >
                Confirmar
              </Button>
              <Button variant="secondary" onClick={() => setPendingEstado(null)} className="flex-1">
                Volver
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bloqueo modal */}
      <Modal open={bloqueoModal} onClose={() => setBloqueoModal(false)} title="Bloquear fecha" size="sm">
        <div className="space-y-4">
          <Input label="Fecha" type="date" value={bloqueoForm.fecha} onChange={e => setBloqueoForm(p => ({ ...p, fecha: e.target.value }))} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de bloqueo</label>
            <div className="flex gap-2">
              {[{ value: 'dia_completo', label: 'Día completo' }, { value: 'franja', label: 'Franja horaria' }].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setBloqueoForm(p => ({ ...p, tipo: opt.value }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${bloqueoForm.tipo === opt.value ? 'bg-[#1565C0] border-[#1565C0] text-white' : 'border-gray-200 text-gray-600'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {bloqueoForm.tipo === 'franja' && (
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Desde</label>
                <input type="time" value={bloqueoForm.franjaInicio} onChange={e => setBloqueoForm(p => ({ ...p, franjaInicio: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]" />
              </div>
              <span className="text-gray-400 text-sm mt-4">hasta</span>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                <input type="time" value={bloqueoForm.franjaFin} onChange={e => setBloqueoForm(p => ({ ...p, franjaFin: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]" />
              </div>
            </div>
          )}
          <Input label="Motivo (opcional)" placeholder="Ej: Reunión, vacaciones..." value={bloqueoForm.motivo} onChange={e => setBloqueoForm(p => ({ ...p, motivo: e.target.value }))} />
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleAddBloqueo}>Bloquear</Button>
            <Button variant="secondary" className="flex-1" onClick={() => setBloqueoModal(false)}>Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Propuesta de reprogramación con slot picker (#5, #19) */}
      <Modal open={!!propuestaModal} onClose={() => setPropuestaModal(null)} title="Proponer nuevo horario" size="md">
        {propuestaModal && (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl p-3 text-sm text-blue-800">
              <p className="font-medium">{pacientes[propuestaModal.userId]?.nombre} {pacientes[propuestaModal.userId]?.apellido}</p>
              <p className="text-blue-600 text-xs mt-0.5">
                Turno original: {propuestaModal.fecha ? formatFecha(propuestaModal.fecha.toDate ? propuestaModal.fecha.toDate() : new Date(propuestaModal.fecha)) : ''} · {propuestaModal.horaInicio}hs
              </p>
            </div>

            <Input
              label="Nueva fecha"
              type="date"
              value={propuestaForm.fecha}
              onChange={e => setPropuestaForm(p => ({ ...p, fecha: e.target.value }))}
            />

            {propuestaForm.fecha && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Nuevo horario</p>
                {propuestaSlotsLoading ? (
                  <Spinner className="h-16" />
                ) : (
                  <AdminSlotPicker
                    slots={propuestaSlots}
                    value={propuestaForm.horaInicio}
                    onChange={h => setPropuestaForm(p => ({ ...p, horaInicio: h }))}
                  />
                )}
              </div>
            )}

            {propuestaForm.horaInicio && (
              <div className="bg-green-50 border border-green-100 rounded-lg px-4 py-2 text-sm text-green-800">
                Propuesta: <strong>{propuestaForm.fecha}</strong> a las <strong>{propuestaForm.horaInicio}hs</strong>
              </div>
            )}

            <p className="text-xs text-gray-400">El paciente verá esta propuesta en "Mis turnos" y podrá aceptarla o rechazarla.</p>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={handlePropuesta} loading={savingPropuesta} disabled={!propuestaForm.horaInicio}>
                Enviar propuesta
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => setPropuestaModal(null)}>Cancelar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
