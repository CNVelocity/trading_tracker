import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5',
        onClick && 'cursor-pointer hover:border-[var(--color-surface-dynamic)] transition-colors',
        className
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center justify-between mb-4', className)}>{children}</div>
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-sm font-medium text-[var(--color-text-muted)]', className)}>
      {children}
    </h3>
  )
}

export function KpiCard({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  valueClass?: string
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      <p className="text-xs text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">{label}</p>
      <p
        className={cn(
          'text-2xl font-semibold tabular-nums leading-none',
          valueClass ?? 'text-[var(--color-text)]'
        )}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-[var(--color-text-muted)] mt-1.5">{sub}</p>}
    </div>
  )
}
