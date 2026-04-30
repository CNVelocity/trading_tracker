import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  children,
  className,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:opacity-50 disabled:pointer-events-none'

  const variants = {
    primary:   'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-stone-950',
    secondary: 'bg-[var(--color-surface-dynamic)] hover:bg-[var(--color-border)] text-[var(--color-text)] border border-[var(--color-border)]',
    ghost:     'hover:bg-[var(--color-surface-dynamic)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
    danger:    'bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/20',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={loading || disabled}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  )
}
