import { db } from './firebase'
import {
  collection, addDoc, updateDoc, doc, query, where,
  getDocs, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { generarSlots, getDiaSemana } from '../utils'

function startOfDay(date) {
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  return Timestamp.fromDate(d)
}
function endOfDay(date) {
  const d = new Date(date); d.setHours(23, 59, 59, 999)
  return Timestamp.fromDate(d)
}

export async function crearTurno({ userId, pacienteId, fecha, horaInicio, horaFin, pedidoMedicoUrl, notasPaciente }) {
  return addDoc(collection(db, 'turnos'), {
    userId, pacienteId,
    fecha: Timestamp.fromDate(new Date(fecha + 'T00:00:00')),
    horaInicio, horaFin,
    estado: 'pendiente',
    pedidoMedicoUrl: pedidoMedicoUrl || '',
    notasAdmin: '', notasPaciente: notasPaciente || '',
    canceladoPor: null, propuestoPor: null, reprogramadoDe: null,
    creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp(),
  })
}

export async function proponerReprogramacion(originalId, { userId, pacienteId, fecha, horaInicio, horaFin }) {
  return addDoc(collection(db, 'turnos'), {
    userId, pacienteId,
    fecha: Timestamp.fromDate(new Date(fecha + 'T00:00:00')),
    horaInicio, horaFin,
    estado: 'propuesto',
    pedidoMedicoUrl: '', notasAdmin: '', notasPaciente: '',
    canceladoPor: null, propuestoPor: 'admin', reprogramadoDe: originalId,
    creadoEn: serverTimestamp(), actualizadoEn: serverTimestamp(),
  })
}

export async function actualizarTurno(turnoId, data) {
  return updateDoc(doc(db, 'turnos', turnoId), { ...data, actualizadoEn: serverTimestamp() })
}

export async function getTurnosByFecha(fecha) {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha
  const q = query(collection(db, 'turnos'), where('fecha', '>=', startOfDay(date)), where('fecha', '<=', endOfDay(date)))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio))
}

export async function getTurnosRango(startDate, endDate) {
  const q = query(collection(db, 'turnos'), where('fecha', '>=', startOfDay(startDate)), where('fecha', '<=', endOfDay(endDate)))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
    const fa = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha ?? 0)
    const fb = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha ?? 0)
    return fa - fb || (a.horaInicio || '').localeCompare(b.horaInicio || '')
  })
}

export async function getTurnosByPaciente(userId) {
  const q = query(collection(db, 'turnos'), where('userId', '==', userId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
    const fa = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha ?? 0)
    const fb = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha ?? 0)
    return fb - fa
  })
}

export async function getTurnoActivoPaciente(userId) {
  const q = query(collection(db, 'turnos'), where('userId', '==', userId), where('estado', 'in', ['pendiente', 'confirmado', 'propuesto']))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

export async function getTurnosCanceladosPorPaciente() {
  const q = query(collection(db, 'turnos'), where('estado', '==', 'cancelado'))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(t => t.canceladoPor === 'paciente')
    .sort((a, b) => b.actualizadoEn?.toDate?.() - a.actualizadoEn?.toDate?.())
    .slice(0, 30)
}

export async function getSlotsByFecha(dateStr, disponibilidad, duracionMin, bloqueos = []) {
  const dia = getDiaSemana(new Date(dateStr + 'T12:00:00'))
  const dispDia = disponibilidad[dia]
  if (!dispDia || !dispDia.activo || !dispDia.franjas?.length) return []

  const bloqueoDia = bloqueos.find(b => {
    const bd = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha)
    const bdStr = `${bd.getFullYear()}-${String(bd.getMonth()+1).padStart(2,'0')}-${String(bd.getDate()).padStart(2,'0')}`
    return bdStr === dateStr && b.tipo === 'dia_completo'
  })
  if (bloqueoDia) return []

  const turnos = await getTurnosByFecha(new Date(dateStr + 'T12:00:00'))
  const conteoOcupados = {}
  turnos.filter(t => t.estado !== 'cancelado').forEach(t => {
    conteoOcupados[t.horaInicio] = (conteoOcupados[t.horaInicio] ?? 0) + 1
  })
  return generarSlots(dispDia.franjas, duracionMin, conteoOcupados)
}

export async function getTurnosProximos(limit = 5) {
  const manana = new Date()
  manana.setDate(manana.getDate() + 1)
  manana.setHours(0, 0, 0, 0)
  const hasta = new Date(manana)
  hasta.setDate(hasta.getDate() + 60)
  const q = query(
    collection(db, 'turnos'),
    where('fecha', '>=', Timestamp.fromDate(manana)),
    where('fecha', '<=', Timestamp.fromDate(hasta)),
  )
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(t => ['pendiente', 'confirmado', 'propuesto'].includes(t.estado))
    .sort((a, b) => {
      const fa = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha ?? 0)
      const fb = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha ?? 0)
      return fa - fb || (a.horaInicio || '').localeCompare(b.horaInicio || '')
    })
    .slice(0, limit)
}

export async function getOcupacionRango(startDate, endDate) {
  const turnos = await getTurnosRango(startDate, endDate)
  const result = {}
  turnos.filter(t => t.estado !== 'cancelado').forEach(t => {
    const fd = t.fecha?.toDate ? t.fecha.toDate() : new Date(t.fecha)
    const ds = `${fd.getFullYear()}-${String(fd.getMonth()+1).padStart(2,'0')}-${String(fd.getDate()).padStart(2,'0')}`
    if (!result[ds]) result[ds] = {}
    result[ds][t.horaInicio] = (result[ds][t.horaInicio] ?? 0) + 1
  })
  return result
}

export async function getTurnosPendientes() {
  const q = query(collection(db, 'turnos'), where('estado', '==', 'pendiente'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
    const fa = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha ?? 0)
    const fb = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha ?? 0)
    return fa - fb || (a.horaInicio || '').localeCompare(b.horaInicio || '')
  })
}

export async function getAllTurnosForStats(months = 6) {
  const desde = new Date()
  desde.setMonth(desde.getMonth() - months)
  desde.setDate(1)
  const q = query(collection(db, 'turnos'), where('fecha', '>=', Timestamp.fromDate(desde)))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function getMetricasDashboard() {
  const hoy = new Date()
  const inicioSemana = new Date(hoy)
  inicioSemana.setDate(hoy.getDate() - hoy.getDay() + 1)
  const finSemana = new Date(inicioSemana); finSemana.setDate(inicioSemana.getDate() + 6)
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)

  const [turnosHoy, turnosSemana, turnosPendientes, turnosCanceladosMes, pacientesSnap] = await Promise.all([
    getTurnosByFecha(hoy),
    getTurnosRango(inicioSemana, finSemana),
    getDocs(query(collection(db, 'turnos'), where('estado', '==', 'pendiente'))),
    getTurnosRango(inicioMes, finMes).then(t => t.filter(x => x.estado === 'cancelado')),
    getDocs(query(collection(db, 'users'), where('rol', '==', 'paciente'))),
  ])

  return {
    turnosHoy: turnosHoy.filter(t => t.estado !== 'cancelado'),
    turnosSemana: turnosSemana.length,
    totalPacientes: pacientesSnap.size,
    turnosPendientes: turnosPendientes.size,
    turnosCanceladosMes: turnosCanceladosMes.length,
  }
}
