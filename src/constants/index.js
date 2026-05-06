export const REGLAS_NEGOCIO = [
  'No olvidar llevar el pedido médico (se debe enviar foto al: 3804362882)',
  'Especialidad: Rehabilitación traumatológica y deportiva',
  'Asistir con ropa adecuada para las sesiones',
  'Tomar UN (1) turno por paciente por vez',
  'De acuerdo al número de sesiones indicadas por el médico tratante, tomar los turnos por día y horario libre',
  'Respetar el horario del turno (tolerancia máxima 10 minutos)',
]

export const ESTADO_TURNO = {
  PENDIENTE: 'pendiente',
  CONFIRMADO: 'confirmado',
  COMPLETADO: 'completado',
  CANCELADO: 'cancelado',
  PROPUESTO: 'propuesto',
}

export const ESTADO_COLORS = {
  pendiente:  'bg-yellow-100 text-yellow-800',
  confirmado: 'bg-blue-100 text-blue-800',
  completado: 'bg-green-100 text-green-800',
  cancelado:  'bg-red-100 text-red-800',
  propuesto:  'bg-purple-100 text-purple-800',
}

export const ROLES = {
  ADMIN: 'admin',
  PACIENTE: 'paciente',
}

export const DIAS_SEMANA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

export const DIAS_LABELS = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

export const CONFIG_DEFAULT = {
  nombreProfesional: 'Lic. Miguel Carrizo',
  descripcion: 'Kinesiólogo especialista en rehabilitación traumatológica y deportiva.',
  direccion: 'Avellaneda 112',
  telefono: '3804362882',
  mensajeBienvenida: 'Bienvenido al sistema de turnos del Lic. Miguel Carrizo.',
  toleranciaMinutos: 10,
  horasLimiteCancelacion: 24,
  duracionSesionMin: 30,
  mpAlias: '',
  mpTitular: 'Miguel Carrizo',
  precioPorSesion: 0,
  autoConfirmar: false,
  mensajeRecordatorio: 'Hola {{nombre}}! Te recordamos tu turno en FisioSalud el {{fecha}} a las {{hora}}hs. ¡Te esperamos!',
}

export const WA_ADMIN = '543804362882'

export const FERIADOS_ARGENTINA_2025 = [
  { fecha: '2025-01-01', motivo: 'Año Nuevo' },
  { fecha: '2025-03-03', motivo: 'Carnaval' },
  { fecha: '2025-03-04', motivo: 'Carnaval' },
  { fecha: '2025-03-24', motivo: 'Día de la Memoria' },
  { fecha: '2025-04-02', motivo: 'Día del Veterano de Malvinas' },
  { fecha: '2025-04-18', motivo: 'Viernes Santo' },
  { fecha: '2025-04-19', motivo: 'Semana Santa' },
  { fecha: '2025-05-01', motivo: 'Día del Trabajador' },
  { fecha: '2025-05-25', motivo: 'Revolución de Mayo' },
  { fecha: '2025-06-16', motivo: 'Feriado Puente' },
  { fecha: '2025-06-20', motivo: 'Paso a la Inmortalidad del Gral. Güemes' },
  { fecha: '2025-07-09', motivo: 'Día de la Independencia' },
  { fecha: '2025-08-17', motivo: 'Paso a la Inmortalidad del Gral. San Martín' },
  { fecha: '2025-10-13', motivo: 'Feriado Puente' },
  { fecha: '2025-11-20', motivo: 'Día de la Soberanía Nacional' },
  { fecha: '2025-11-21', motivo: 'Feriado Puente' },
  { fecha: '2025-12-08', motivo: 'Inmaculada Concepción de María' },
  { fecha: '2025-12-25', motivo: 'Navidad' },
]
