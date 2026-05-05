import { db } from './firebase'
import {
  collection, doc, getDocs, getDoc, updateDoc, deleteDoc, setDoc, query,
  where, serverTimestamp,
} from 'firebase/firestore'

export async function getPacientes() {
  const snap = await getDocs(query(collection(db, 'users'), where('rol', '==', 'paciente')))
  const pacSnap = await getDocs(collection(db, 'pacientes'))
  const pacMap = {}
  pacSnap.docs.forEach(d => { pacMap[d.data().userId] = { pacienteId: d.id, ...d.data() } })
  return snap.docs.map(d => ({ id: d.id, ...d.data(), clinica: pacMap[d.id] || null }))
}

export async function getPacienteByUserId(userId) {
  const [userSnap, pacSnap] = await Promise.all([
    getDoc(doc(db, 'users', userId)),
    getDoc(doc(db, 'pacientes', userId)),
  ])
  if (!userSnap.exists()) return null
  return {
    id: userSnap.id,
    ...userSnap.data(),
    clinica: pacSnap.exists() ? { pacienteId: pacSnap.id, ...pacSnap.data() } : null,
  }
}

export async function updateUserData(userId, data) {
  const payload = { ...data, actualizadoEn: serverTimestamp() }
  if (payload.obraSocialId === '') payload.obraSocialId = null
  return updateDoc(doc(db, 'users', userId), payload)
}

export async function updatePacienteClinica(userId, data) {
  return updateDoc(doc(db, 'pacientes', userId), { ...data, actualizadoEn: serverTimestamp() })
}

export async function crearPacienteManual(data) {
  const ref = doc(collection(db, 'users'))
  await setDoc(ref, {
    uid: ref.id,
    rol: 'paciente',
    nombre: data.nombre || '',
    apellido: data.apellido || '',
    email: data.email || '',
    dni: data.dni || '',
    telefono: data.telefono || '',
    fechaNacimiento: data.fechaNacimiento || null,
    obraSocialId: data.obraSocialId || null,
    fotoUrl: '',
    creadoEn: serverTimestamp(),
  })
  await setDoc(doc(db, 'pacientes', ref.id), {
    userId: ref.id,
    diagnostico: '',
    sesionesIndicadas: 0,
    sesionesCompletadas: 0,
    pedidoMedicoUrl: '',
    notas: '',
    creadoEn: serverTimestamp(),
    actualizadoEn: serverTimestamp(),
  })
  return ref.id
}

export async function eliminarPaciente(userId) {
  await Promise.all([
    deleteDoc(doc(db, 'users', userId)),
    deleteDoc(doc(db, 'pacientes', userId)),
  ])
}

export async function searchPacientes(term) {
  const all = await getPacientes()
  const t = term.toLowerCase()
  return all.filter(p =>
    p.nombre?.toLowerCase().includes(t) ||
    p.apellido?.toLowerCase().includes(t) ||
    p.dni?.includes(t) ||
    p.email?.toLowerCase().includes(t)
  )
}
