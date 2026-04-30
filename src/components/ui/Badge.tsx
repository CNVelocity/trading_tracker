import clsx from 'clsx'

type Variant = 'default' | 'buy' | 'sell' | 'open' | 'closed' | 'high' | 'medium' | 'low'

const VARIANT: Record<Variant, string> = {
  default: 'bg-stone-800 text-stone-300',
  buy:     'bg-teal-400/10   text-teal-400',
  sell:    'bg-red-400/10    text-red-400',
  open:    'bg-emerald-400/10 text-emerald-400',
  closed:  'bg-stone-700     text-stone-400',
  high:    'bg-red-400/10    text-red-400',
  medium:  'bg-yellow-400/10 text-yellow-400',
  low:     'bg-stone-800     text-stone-400',
}

interface Props {
  variant?: Variant
  className?: string
  children: React.ReactNode
}

export default function Badge({ variant = 'default', className, children }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
        VARIANT[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
