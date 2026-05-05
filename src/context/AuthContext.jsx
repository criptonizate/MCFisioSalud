import { createContext, useContext, useEffect, useState } from 'react'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../services/firebase'
import { ROLES } from '../constants'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubSnap = null

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubSnap) { unsubSnap(); unsubSnap = null }

      if (firebaseUser) {
        setLoading(true)
        const userRef = doc(db, 'users', firebaseUser.uid)

        try {
          const snap = await getDoc(userRef)
          if (!snap.exists()) {
            const parts = (firebaseUser.displayName || '').split(' ')
            const newData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              nombre: parts[0] || '',
              apellido: parts.slice(1).join(' ') || '',
              dni: '',
              telefono: '',
              fechaNacimiento: null,
              rol: ROLES.PACIENTE,
              fotoUrl: firebaseUser.photoURL || '',
              creadoEn: serverTimestamp(),
            }
            await setDoc(userRef, newData)
            await setDoc(doc(db, 'pacientes', firebaseUser.uid), {
              userId: firebaseUser.uid,
              diagnostico: '',
              sesionesIndicadas: 0,
              sesionesCompletadas: 0,
              pedidoMedicoUrl: '',
              notas: '',
              creadoEn: serverTimestamp(),
              actualizadoEn: serverTimestamp(),
            })
          }
        } catch (err) {
          console.error('Error al inicializar usuario en Firestore:', err)
          setUser(firebaseUser)
          setLoading(false)
          return
        }

        setUser(firebaseUser)

        // Escuchar cambios en tiempo real (ej: cambio de rol desde Firestore Console)
        unsubSnap = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) setUserData(docSnap.data())
          setLoading(false)
        }, () => {
          // Error en onSnapshot (ej: reglas denegadas) — desbloquear carga
          setLoading(false)
        })
      } else {
        setUser(null)
        setUserData(null)
        setLoading(false)
      }
    })

    return () => { unsubAuth(); if (unsubSnap) unsubSnap() }
  }, [])

  function loginWithGoogle() {
    const provider = new GoogleAuthProvider()
    return signInWithPopup(auth, provider)
  }

  function logout() {
    return signOut(auth)
  }

  const isAdmin = userData?.rol === ROLES.ADMIN

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAdmin, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
