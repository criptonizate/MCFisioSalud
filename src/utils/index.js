export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function formatFecha(date) {
  if (!date) return ''
  const d = date?.toDate ? date.toDate() : new Date(date)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function formatFechaLarga(date) {
  if (!date) return ''
  const d = date?.toDate ? date.toDate() : new Date(date)
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatHora(str) {
  return str || ''
}

export function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number)
  const total = h * 60 + m + minutes
  const hh = Math.floor(total / 60).toString().padStart(2, '0')
  const mm = (total % 60).toString().padStart(2, '0')
  return `${hh}:${mm}`
}

export function generarSlots(franjas, duracionMin, conteoOcupados = {}) {
  const slots = []
  for (const franja of franjas) {
    const capacidad = franja.capacidad ?? 1
    let current = franja.inicio
    while (current < franja.fin) {
      const fin = addMinutes(current, duracionMin)
      if (fin <= franja.fin) {
        const ocupados = conteoOcupados[current] ?? 0
        const disponibles = capacidad - ocupados
        if (disponibles > 0) slots.push({ hora: current, disponibles, capacidad })
      }
      current = fin
    }
  }
  return slots
}

export function esFechaFutura(fecha) {
  return new Date(fecha) > new Date()
}

export function getDiaSemana(date) {
  const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return dias[new Date(date).getDay()]
}
