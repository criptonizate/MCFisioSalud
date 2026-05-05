import { db } from './firebase'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { CONFIG_DEFAULT } from '../constants'

export async function getConfig() {
  const snap = await getDoc(doc(db, 'config', 'global'))
  return snap.exists() ? snap.data() : CONFIG_DEFAULT
}

export async function updateConfig(data) {
  return setDoc(doc(db, 'config', 'global'), { ...data, actualizadoEn: serverTimestamp() }, { merge: true })
}
