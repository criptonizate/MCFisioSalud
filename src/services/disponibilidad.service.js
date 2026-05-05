import { db } from './firebase'
import {
  collection, doc, getDocs, getDoc, setDoc, addDoc,
  deleteDoc, query, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { DIAS_SEMANA } from '../constants'

export async function getDisponibilidad() {
  const result = {}
  await Promise.all(
    DIAS_SEMANA.map(async (dia) => {
      const snap = await getDoc(doc(db, 'disponibilidad', dia))
      result[dia] = snap.exists()
        ? snap.data()
        : { dia, activo: false, franjas: [], duracionSesionMin: 45 }
    })
  )
  return result
}

export async function updateDisponibilidadDia(dia, data) {
  return setDoc(doc(db, 'disponibilidad', dia), { dia, ...data }, { merge: true })
}

export async function getBloqueos() {
  const snap = await getDocs(collection(db, 'bloqueos'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
    const fa = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha)
    const fb = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha)
    return fa - fb
  })
}

export async function addBloqueo({ fecha, motivo, tipo = 'dia_completo', franjaInicio, franjaFin }) {
  return addDoc(collection(db, 'bloqueos'), {
    fecha: Timestamp.fromDate(new Date(fecha + 'T12:00:00')),
    motivo: motivo || '',
    tipo,
    franjaInicio: franjaInicio || null,
    franjaFin: franjaFin || null,
    creadoEn: serverTimestamp(),
  })
}

export async function deleteBloqueo(bloqueoId) {
  return deleteDoc(doc(db, 'bloqueos', bloqueoId))
}

export function isFechaBlocked(dateStr, bloqueos) {
  return bloqueos.some(b => {
    const bd = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha)
    const bdStr = `${bd.getFullYear()}-${String(bd.getMonth()+1).padStart(2,'0')}-${String(bd.getDate()).padStart(2,'0')}`
    return bdStr === dateStr && b.tipo === 'dia_completo'
  })
}
