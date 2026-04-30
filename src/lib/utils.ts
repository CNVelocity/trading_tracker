import { clsx, type ClassValue } from 'clsx'
import type { Grade, Market, Currency } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(
  amount: string | number | null | undefined,
  currency: Currency = 'CNY'
): string {
  if (amount === null || amount === undefined) return '—'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return '—'
  const symbols: Record<Currency, string> = { CNY: '¥', HKD: 'HK$', USD: '$' }
  return `${symbols[currency]}${num.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatPercent(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatNumber(n: string | number | null | undefined, decimals = 2): string {
  if (n === null || n === undefined) return '—'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '—'
  return num.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function gradeBadgeClass(grade: Grade): string {
  const map: Record<Grade, string> = {
    S: 'bg-teal-500/15 text-teal-300 border-teal-500/20',
    A: 'bg-green-500/15 text-green-300 border-green-500/20',
    B: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
    C: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
    D: 'bg-red-500/15 text-red-300 border-red-500/20',
  }
  return map[grade]
}

export function marketLabel(market: Market): string {
  const map: Record<Market, string> = {
    A_SHARE: 'A股',
    HK: '港股',
    US: '美股',
    ETF: 'ETF',
    OTHER: '其他',
  }
  return map[market]
}

export function pnlClass(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return 'text-stone-400'
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (num > 0) return 'text-green-400'
  if (num < 0) return 'text-red-400'
  return 'text-stone-400'
}

export function scoreToGrade(score: number): Grade {
  if (score >= 90) return 'S'
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  return 'D'
}

export function calcReturnPct(avgCost: string | null, currentPrice: number): number | null {
  if (!avgCost) return null
  const cost = parseFloat(avgCost)
  if (cost <= 0) return null
  return ((currentPrice - cost) / cost) * 100
}
