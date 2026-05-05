import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: 'AIzaSyCdXe58sK0sz4nGiWK7RrMA8FahrMLlJS8',
  authDomain: 'mcfisiosalud.firebaseapp.com',
  projectId: 'mcfisiosalud',
  storageBucket: 'mcfisiosalud.firebasestorage.app',
  messagingSenderId: '709047414147',
  appId: '1:709047414147:web:db907dfdab697de62cdab6',
  measurementId: 'G-FNBPBMD41M',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
