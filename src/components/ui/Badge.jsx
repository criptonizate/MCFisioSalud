import { cn } from '../../utils'
import { ESTADO_COLORS } from '../../constants'
import { Clock, Check, CheckCircle2, X, RefreshCw } from 'lucide-react'

const ICONS  = { pendiente: Clock, confirmado: Check, completado: CheckCircle2, cancelado: X, propuesto: RefreshCw }
const LABELS = { pendiente: 'Pendiente', confirmado: 'Confirmado', completado: 'Completado', cancelado: 'Cancelado', propuesto: 'Propuesto' }

export function Badge({ estado, className }) {
  const Icon = ICONS[estado]
  return (
    <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', ESTADO_COLORS[estado], className)}>
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {LABELS[estado] || estado}
    </span>
  )
}
