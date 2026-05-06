// Seed de datos demo para mostrar al cliente
// Crea 10 pacientes con turnos en distintos estados y obras sociales
//
// ANTES DE CORRER:
//   1. En firestore.rules, poner temporalmente en users, pacientes y turnos:
//      allow write: if true;
//   2. node seed_demo.mjs
//   3. Restaurar las reglas originales

import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, addDoc, setDoc, doc,
  serverTimestamp, Timestamp, getDocs,
} from 'firebase/firestore'

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

// Devuelve el N-ésimo día hábil SIGUIENTE (Lun-Vie)
function proximoDiaHabil(n) {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  let habiles = 0
  while (habiles < n) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) habiles++
  }
  return new Date(d)
}

// Devuelve el N-ésimo día hábil ANTERIOR
function anteriorDiaHabil(n) {
  const d = new Date(); d.setHours(0, 0, 0, 0)
  let habiles = 0
  while (habiles < n) {
    d.setDate(d.getDate() - 1)
    if (d.getDay() !== 0 && d.getDay() !== 6) habiles++
  }
  return new Date(d)
}

function horaFin(inicio, durMin = 30) {
  const [h, m] = inicio.split(':').map(Number)
  const t = h * 60 + m + durMin
  return `${Math.floor(t / 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`
}

async function seed() {
  // Cargar obras sociales reales de Firestore
  console.log('Cargando obras sociales...')
  const osSnap = await getDocs(collection(db, 'obrasSociales'))
  const osMap = {}
  osSnap.docs.forEach(d => { osMap[d.data().nombre.toUpperCase()] = d.id })
  console.log(`  Encontradas: ${Object.keys(osMap).join(', ')}\n`)

  function findOs(keywords) {
    for (const kw of keywords) {
      const key = Object.keys(osMap).find(k => k.includes(kw.toUpperCase()))
      if (key) return osMap[key]
    }
    return null
  }

  // ──────────────────────────────────────────────
  // DEFINICIÓN DE PACIENTES + TURNOS
  // ──────────────────────────────────────────────
  const pacientes = [
    {
      uid: 'demo_pac_001',
      nombre: 'María', apellido: 'García',
      dni: '28456789', telefono: '3804201234',
      email: 'maria.garcia.demo@gmail.com',
      obrasSocialKeys: ['PAMI'],
      fechaNacimiento: '1958-03-12',
      diagnostico: 'Tendinitis de hombro derecho post-quirúrgico',
      sesionesIndicadas: 12, sesionesCompletadas: 3,
      notas: 'Paciente con buena adherencia. Continuar con ejercicios de movilidad.',
      turno: {
        fecha: proximoDiaHabil(2),
        horaInicio: '08:30', estado: 'confirmado',
        notasPaciente: 'Me duele al levantar el brazo por encima de la cabeza.',
      },
    },
    {
      uid: 'demo_pac_002',
      nombre: 'Carlos', apellido: 'Rodríguez',
      dni: '31234567', telefono: '3804345678',
      email: 'carlos.rodriguez.demo@gmail.com',
      obrasSocialKeys: ['OSDE'],
      fechaNacimiento: '1975-07-22',
      diagnostico: 'Lumbalgia crónica por hernia de disco L4-L5',
      sesionesIndicadas: 8, sesionesCompletadas: 1,
      notas: '',
      turno: {
        fecha: proximoDiaHabil(3),
        horaInicio: '09:00', estado: 'confirmado',
        notasPaciente: '',
      },
    },
    {
      uid: 'demo_pac_003',
      nombre: 'Ana', apellido: 'Martínez',
      dni: '34567890', telefono: '3804456789',
      email: 'ana.martinez.demo@gmail.com',
      obrasSocialKeys: ['SWISS', 'SWISS MEDICAL'],
      fechaNacimiento: '1990-11-05',
      diagnostico: 'Esguince de tobillo grado II — post ligamentaria',
      sesionesIndicadas: 6, sesionesCompletadas: 0,
      notas: 'Derivada por traumatólogo Dr. Pérez.',
      turno: {
        fecha: proximoDiaHabil(4),
        horaInicio: '09:30', estado: 'pendiente',
        notasPaciente: 'Me operé hace 3 semanas del tobillo.',
      },
    },
    {
      uid: 'demo_pac_004',
      nombre: 'Pedro', apellido: 'López',
      dni: '25678901', telefono: '3804567890',
      email: 'pedro.lopez.demo@gmail.com',
      obrasSocialKeys: [],
      fechaNacimiento: '1968-04-18',
      diagnostico: 'Cervicalgia con irradiación braquial derecha',
      sesionesIndicadas: 10, sesionesCompletadas: 2,
      notas: 'Paga particular. Abona en efectivo.',
      turno: {
        fecha: proximoDiaHabil(5),
        horaInicio: '10:00', estado: 'pendiente',
        notasPaciente: '',
      },
    },
    {
      uid: 'demo_pac_005',
      nombre: 'Laura', apellido: 'Fernández',
      dni: '38901234', telefono: '3804678901',
      email: 'laura.fernandez.demo@gmail.com',
      obrasSocialKeys: ['GALENO'],
      fechaNacimiento: '1995-02-28',
      diagnostico: 'Rotura parcial de LCA rodilla izquierda — rehabilitación post-quirúrgica',
      sesionesIndicadas: 20, sesionesCompletadas: 8,
      notas: 'Excelente evolución. Empezar con trabajo de propiocepción.',
      turno: {
        fecha: anteriorDiaHabil(3),
        horaInicio: '08:00', estado: 'completado',
        notasPaciente: 'Siento que mejoré bastante desde la cirugía.',
      },
    },
    {
      uid: 'demo_pac_006',
      nombre: 'Diego', apellido: 'Gómez',
      dni: '29012345', telefono: '3804789012',
      email: 'diego.gomez.demo@gmail.com',
      obrasSocialKeys: ['IOMA'],
      fechaNacimiento: '1982-09-14',
      diagnostico: 'Epicondilitis lateral (codo de tenista)',
      sesionesIndicadas: 8, sesionesCompletadas: 5,
      notas: 'Trabaja en computación. Recomendar ergonomía en el trabajo.',
      turno: {
        fecha: anteriorDiaHabil(7),
        horaInicio: '09:00', estado: 'completado',
        notasPaciente: '',
      },
    },
    {
      uid: 'demo_pac_007',
      nombre: 'Valentina', apellido: 'Ruiz',
      dni: '41234567', telefono: '3804890123',
      email: 'valentina.ruiz.demo@gmail.com',
      obrasSocialKeys: ['OSECAC'],
      fechaNacimiento: '2001-06-30',
      diagnostico: 'Fractura de radio distal — rehabilitación post-yeso',
      sesionesIndicadas: 10, sesionesCompletadas: 0,
      notas: '',
      turno: {
        fecha: proximoDiaHabil(7),
        horaInicio: '08:00', estado: 'confirmado',
        notasPaciente: 'Me sacaron el yeso la semana pasada.',
      },
    },
    {
      uid: 'demo_pac_008',
      nombre: 'Roberto', apellido: 'Silva',
      dni: '26789012', telefono: '3804901234',
      email: 'roberto.silva.demo@gmail.com',
      obrasSocialKeys: [],
      fechaNacimiento: '1971-12-03',
      diagnostico: 'Gonartrosis bilateral — dolor crónico rodilla',
      sesionesIndicadas: 15, sesionesCompletadas: 4,
      notas: 'Canceló sin aviso. Llamar antes del próximo turno.',
      turno: {
        fecha: anteriorDiaHabil(2),
        horaInicio: '08:30', estado: 'cancelado',
        notasPaciente: '',
      },
    },
    {
      uid: 'demo_pac_009',
      nombre: 'Claudia', apellido: 'Torres',
      dni: '32456789', telefono: '3804012345',
      email: 'claudia.torres.demo@gmail.com',
      obrasSocialKeys: ['PAMI'],
      fechaNacimiento: '1955-08-19',
      diagnostico: 'Parálisis facial periférica — rehabilitación neurológica',
      sesionesIndicadas: 16, sesionesCompletadas: 6,
      notas: 'Buena respuesta al tratamiento. Continuar estimulación facial.',
      turno: {
        fecha: proximoDiaHabil(9),
        horaInicio: '09:00', estado: 'pendiente',
        notasPaciente: 'Quiero saber cuándo voy a poder mover bien la cara de nuevo.',
      },
    },
    {
      uid: 'demo_pac_010',
      nombre: 'Martín', apellido: 'Herrera',
      dni: '36789012', telefono: '3804123456',
      email: 'martin.herrera.demo@gmail.com',
      obrasSocialKeys: ['ACCORD', 'ACCORD SALUD'],
      fechaNacimiento: '1988-05-07',
      diagnostico: 'Distensión muscular isquiotibial izquierdo — jugador de fútbol',
      sesionesIndicadas: 6, sesionesCompletadas: 0,
      notas: 'Jugador amateur. Quiere volver a entrenar lo antes posible.',
      turno: {
        fecha: proximoDiaHabil(10),
        horaInicio: '10:00', estado: 'confirmado',
        notasPaciente: 'Me lesioné jugando al fútbol el domingo.',
      },
    },
  ]

  // ──────────────────────────────────────────────
  // INSERTAR EN FIRESTORE
  // ──────────────────────────────────────────────
  console.log('Creando pacientes y turnos...\n')

  for (const p of pacientes) {
    const obraSocialId = findOs(p.obrasSocialKeys) || null

    // User doc (simula el registro de Google Auth)
    await setDoc(doc(db, 'users', p.uid), {
      nombre: p.nombre,
      apellido: p.apellido,
      email: p.email,
      telefono: p.telefono,
      dni: p.dni,
      fechaNacimiento: p.fechaNacimiento,
      obraSocialId,
      rol: 'paciente',
      creadoEn: serverTimestamp(),
    })

    // Paciente doc (datos clínicos)
    await setDoc(doc(db, 'pacientes', p.uid), {
      userId: p.uid,
      nombre: p.nombre,
      apellido: p.apellido,
      email: p.email,
      telefono: p.telefono,
      dni: p.dni,
      fechaNacimiento: p.fechaNacimiento,
      obraSocialId,
      clinica: {
        diagnostico: p.diagnostico,
        sesionesIndicadas: p.sesionesIndicadas,
        sesionesCompletadas: p.sesionesCompletadas,
        notas: p.notas,
        pedidoMedicoUrl: '',
      },
      creadoEn: serverTimestamp(),
    })

    // Turno
    const { fecha, horaInicio, estado, notasPaciente } = p.turno
    fecha.setHours(0, 0, 0, 0)
    await addDoc(collection(db, 'turnos'), {
      userId: p.uid,
      pacienteId: p.uid,
      fecha: Timestamp.fromDate(fecha),
      horaInicio,
      horaFin: horaFin(horaInicio),
      estado,
      notasPaciente: notasPaciente || '',
      notasAdmin: '',
      pedidoMedicoUrl: '',
      canceladoPor: estado === 'cancelado' ? 'paciente' : null,
      propuestoPor: null,
      reprogramadoDe: null,
      creadoEn: serverTimestamp(),
      actualizadoEn: serverTimestamp(),
    })

    const osNombre = p.obrasSocialKeys[0] || 'Particular'
    const fechaStr = fecha.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' })
    console.log(`  ✓ ${p.nombre} ${p.apellido} — ${osNombre} — ${estado.toUpperCase()} — ${fechaStr} ${horaInicio}`)
  }

  console.log('\n✅ Demo cargado exitosamente.')
  console.log('Acordate de restaurar las reglas de Firestore.')
  process.exit(0)
}

seed().catch(e => { console.error('Error:', e.message); process.exit(1) })
