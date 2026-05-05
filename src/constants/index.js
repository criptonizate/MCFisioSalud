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
  duracionSesionMin: 45,
  mpAlias: '',
  mpTitular: 'Miguel Carrizo',
}

export const WA_ADMIN = '543804362882'
