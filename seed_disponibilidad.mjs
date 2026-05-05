// Seed inicial de disponibilidad: Lun-Jue 8-10:30 y 15:30-17:30, Vie 8-10:30
// Capacidad: 3 pacientes por turno. Duración de sesión: 30 minutos.
//
// Antes de correr:
//   1. En firestore.rules, cambiar disponibilidad y config a: allow write: if true;
//   2. npm run seed:disp  (o: node seed_disponibilidad.mjs)
//   3. Restaurar las reglas de Firestore

import { initializeApp } from 'firebase/app'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCdXe58sK0sz4nGiWK7RrMA8FahrMLlJS8',
  authDomain: 'mcfisiosalud.firebaseapp.com',
  projectId: 'mcfisiosalud',
  storageBucket: 'mcfisiosalud.firebasestorage.app',
  messagingSenderId: '709047414147',
  appId: '1:709047414147:web:db907dfdab697de62cdab6',
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const MANANA = { inicio: '08:00', fin: '10:30', capacidad: 3 }
const TARDE  = { inicio: '15:30', fin: '17:30', capacidad: 3 }

const disponibilidad = {
  lunes:     { activo: true,  franjas: [MANANA, TARDE] },
  martes:    { activo: true,  franjas: [MANANA, TARDE] },
  miercoles: { activo: true,  franjas: [MANANA, TARDE] },
  jueves:    { activo: true,  franjas: [MANANA, TARDE] },
  viernes:   { activo: true,  franjas: [MANANA] },
  sabado:    { activo: false, franjas: [] },
  domingo:   { activo: false, franjas: [] },
}

async function seed() {
  console.log('Seeding disponibilidad...')
  for (const [dia, data] of Object.entries(disponibilidad)) {
    await setDoc(doc(db, 'disponibilidad', dia), { dia, ...data })
    console.log(`  ✓ ${dia}: ${data.activo ? data.franjas.map(f => `${f.inicio}-${f.fin} (${f.capacidad} cupos)`).join(', ') : 'inactivo'}`)
  }

  await setDoc(doc(db, 'config', 'global'), { duracionSesionMin: 30 }, { merge: true })
  console.log('  ✓ config: duracionSesionMin = 30')

  console.log('\nDone! Acordate de restaurar las reglas de Firestore.')
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
