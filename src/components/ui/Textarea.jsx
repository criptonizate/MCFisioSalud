import { cn } from '../../utils'

export function Textarea({ label, error, className, rows = 3, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
      <textarea
        rows={rows}
        {...props}
        className={cn(
          'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1565C0] focus:border-transparent transition-colors resize-none',
          error && 'border-red-500',
          className,
        )}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
