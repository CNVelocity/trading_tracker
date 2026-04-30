import type { GradeType, MarketType } from '@/types'

export function formatCurrency(value: number | string, currency = 'CNY'): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatPct(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  const sign = num >= 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

export function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return new Intl.NumberFormat('zh-CN').format(num)
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })
}

export const GRADE_COLOR: Record<GradeType, string> = {
  S: 'text-emerald-400',
  A: 'text-teal-400',
  B: 'text-yellow-400',
  C: 'text-orange-400',
  D: 'text-red-400',
}

export const GRADE_BG: Record<GradeType, string> = {
  S: 'bg-emerald-400/10 text-emerald-400',
  A: 'bg-teal-400/10 text-teal-400',
  B: 'bg-yellow-400/10 text-yellow-400',
  C: 'bg-orange-400/10 text-orange-400',
  D: 'bg-red-400/10 text-red-400',
}

export const MARKET_LABEL: Record<MarketType, string> = {
  A_SHARE: 'A股',
  HK: '港股',
  US: '美股',
  ETF: 'ETF',
  OTHER: '其他',
}
