import { cn } from '@/lib/utils'
import type { Grade } from '@/types'
import { gradeBadgeClass, marketLabel } from '@/lib/utils'
import type { Market } from '@/types'

interface BadgeProps {
  children: React.ReactNode
  className?: string
}

export function Badge({ children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border',
        className
      )}
    >
      {children}
    </span>
  )
}

export function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <Badge className={cn(gradeBadgeClass(grade), 'font-bold tracking-wide')}>
      {grade}
    </Badge>
  )
}

export function MarketBadge({ market }: { market: Market }) {
  const colorMap: Record<Market, string> = {
    A_SHARE: 'bg-red-500/10 text-red-300 border-red-500/20',
    HK:      'bg-purple-500/10 text-purple-300 border-purple-500/20',
    US:      'bg-blue-500/10 text-blue-300 border-blue-500/20',
    ETF:     'bg-teal-500/10 text-teal-300 border-teal-500/20',
    OTHER:   'bg-stone-500/10 text-stone-300 border-stone-500/20',
  }
  return <Badge className={colorMap[market]}>{marketLabel(market)}</Badge>
}

export function DirectionBadge({ direction }: { direction: 'BUY' | 'SELL' }) {
  return (
    <Badge
      className={
        direction === 'BUY'
          ? 'bg-green-500/10 text-green-300 border-green-500/20'
          : 'bg-red-500/10 text-red-300 border-red-500/20'
      }
    >
      {direction === 'BUY' ? '买入' : '卖出'}
    </Badge>
  )
}
