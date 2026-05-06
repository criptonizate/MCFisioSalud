import { db } from './firebase'
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, serverTimestamp, query, where,
} from 'firebase/firestore'

export async function unirseListaEspera(userId, { nombre, apellido, telefono, email }) {
  const q = query(collection(db, 'listaEspera'), where('userId', '==', userId), where('estado', '==', 'pendiente'))
  const snap = await getDocs(q)
  if (!snap.empty) return { id: snap.docs[0].id, yaEstaba: true }
  const ref = await addDoc(collection(db, 'listaEspera'), {
    userId, nombre, apellido, telefono: telefono || '', email: email || '',
    estado: 'pendiente',
    creadoEn: serverTimestamp(),
  })
  return { id: ref.id, yaEstaba: false }
}

export async function getListaEspera() {
  const q = query(collection(db, 'listaEspera'), where('estado', '==', 'pendiente'))
  const snap = await getDocs(q)
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.creadoEn?.toDate?.() || 0) - (b.creadoEn?.toDate?.() || 0))
}

export async function notificarListaEspera(id) {
  return updateDoc(doc(db, 'listaEspera', id), { estado: 'notificado' })
}

export async function eliminarListaEspera(id) {
  return deleteDoc(doc(db, 'listaEspera', id))
}
