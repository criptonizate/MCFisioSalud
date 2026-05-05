import { db } from './firebase'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp,
} from 'firebase/firestore'

export async function getObrasSociales() {
  const snap = await getDocs(collection(db, 'obrasSociales'))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
}

export async function crearObraSocial(nombre) {
  return addDoc(collection(db, 'obrasSociales'), {
    nombre: nombre.trim(),
    activa: true,
    creadoEn: serverTimestamp(),
  })
}

export async function actualizarObraSocial(id, data) {
  return updateDoc(doc(db, 'obrasSociales', id), data)
}

export async function eliminarObraSocial(id) {
  return deleteDoc(doc(db, 'obrasSociales', id))
}
