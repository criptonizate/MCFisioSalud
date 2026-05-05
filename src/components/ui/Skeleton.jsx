export function SkeletonLine({ className = '' }) {
  return <div className={`animate-pulse bg-gray-200 rounded-full ${className}`} />
}

export function SkeletonCard({ lines = 3, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-100 p-4 space-y-3 ${className}`}>
      <SkeletonLine className="h-4 w-2/3" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonLine key={i} className="h-3 w-full" />
      ))}
    </div>
  )
}

export function SkeletonList({ count = 3, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  )
}
