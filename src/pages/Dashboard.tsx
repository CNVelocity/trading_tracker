import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'
import { Card, KpiCard } from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/Skeleton'
import type { DashboardStats, Position } from '@/types'

// ── Helpers ─────────────────────────────────────────────────────────────

const MARKET_LABEL: Record<string, string> = {
  A_SHARE: 'A股', HK: '港股', US: '美股', ETF: 'ETF', OTHER: '其他',
}
const MARKET_COLOR: Record<string, string> = {
  A_SHARE: 'bg-red-500/15 text-red-400',
  HK:      'bg-orange-500/15 text-orange-400',
  US:      'bg-blue-500/15 text-blue-400',
  ETF:     'bg-teal-500/15 text-teal-400',
  OTHER:   'bg-stone-500/15 text-stone-400',
}

const GRADE_COLOR: Record<string, string> = {
  S: 'bg-teal-500/15 text-teal-400',
  A: 'bg-green-500/15 text-green-400',
  B: 'bg-yellow-500/15 text-yellow-400',
  C: 'bg-orange-500/15 text-orange-400',
  D: 'bg-red-500/15 text-red-400',
}

function fmt(n: number, currency = 'CNY') {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(n)
}

function holdDays(openedAt: string): number {
  return Math.floor((Date.now() - new Date(openedAt).getTime()) / 86_400_000)
}

// ── Skeleton rows ──────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-[var(--color-border)]">
      {[140, 60, 80, 80, 100, 60].map((w, i) => (
        <td key={i} className="py-3 px-4">
          <div
            className="h-4 rounded animate-pulse bg-[var(--color-surface-offset)]"
            style={{ width: w }}
          />
        </td>
      ))}
    </tr>
  )
}

// ── Grade badge ────────────────────────────────────────────────────────

function GradeBadge({ grade }: { grade: string }) {
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${GRADE_COLOR[grade] ?? GRADE_COLOR.D}`}>
      {grade}
    </span>
  )
}

// ── Score ring ─────────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const pct   = Math.min(score / 100, 1)
  const r     = 18
  const circ  = 2 * Math.PI * r
  const dash  = circ * pct
  const grade = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 45 ? 'C' : 'D'
  const colors: Record<string, string> = {
    S: '#2dd4bf', A: '#4ade80', B: '#facc15', C: '#fb923c', D: '#f87171',
  }
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="var(--color-surface-offset)" strokeWidth="3.5" />
        <circle
          cx="24" cy="24" r={r} fill="none"
          stroke={colors[grade]}
          strokeWidth="3.5"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <span className="absolute text-sm font-semibold tabular-nums" style={{ color: colors[grade] }}>
        {score}
      </span>
    </div>
  )
}

// ── Empty state ─────────────────────────────────────────────────────────

function EmptyPositions({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg viewBox="0 0 64 64" className="w-14 h-14 mb-4 text-[var(--color-text-faint)]" fill="none">
        <rect x="8" y="20" width="48" height="36" rx="4" stroke="currentColor" strokeWidth="2" />
        <path d="M8 28h48" stroke="currentColor" strokeWidth="2" />
        <path d="M20 20V14a12 12 0 0 1 24 0v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="42" r="4" stroke="currentColor" strokeWidth="2" />
      </svg>
      <p className="text-sm font-medium text-[var(--color-text-muted)] mb-1">还没有持仓</p>
      <p className="text-xs text-[var(--color-text-faint)] mb-5 max-w-[24ch]">
        记录你的第一笔交易，并完成决策评分问卷
      </p>
      <button
        onClick={onNew}
        className="text-xs font-medium px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors"
      >
        记录第一笔交易
      </button>
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate()

  const [stats,     setStats]     = useState<DashboardStats & { totalInvested?: string | null } | null>(null)
  const [positions, setPositions] = useState<Position[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      api.get<DashboardStats & { totalInvested?: string | null }>('/stats'),
      api.get<Position[]>('/positions?status=OPEN'),
    ])
      .then(([s, p]) => { setStats(s); setPositions(p) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // grade from avgDecisionScore
  const avgScore  = stats?.avgDecisionScore ?? null
  const avgGrade  = avgScore == null ? null
    : avgScore >= 90 ? 'S' : avgScore >= 75 ? 'A' : avgScore >= 60 ? 'B' : avgScore >= 45 ? 'C' : 'D'

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">Dashboard</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">交易概览与决策质量</p>
        </div>
        <button
          onClick={() => navigate('/trades/new')}
          className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M8 2v12M2 8h12" />
          </svg>
          记录交易
        </button>
      </div>

      {/* ── KPI cards ── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            label="开仓持仓"
            value={stats?.openPositionsCount ?? 0}
            sub={`共 ${stats?.totalPositionsCount ?? 0} 笔交易`}
          />
          <KpiCard
            label="总投入"
            value={
              stats?.totalInvested
                ? fmt(Number(stats.totalInvested))
                : '—'
            }
            sub="当前开仓合计"
          />
          <KpiCard
            label="已实现盈亏"
            value={
              stats?.totalRealizedPnl
                ? fmt(Number(stats.totalRealizedPnl))
                : '—'
            }
            valueClass={
              stats?.totalRealizedPnl
                ? Number(stats.totalRealizedPnl) >= 0
                  ? 'text-green-400'
                  : 'text-red-400'
                : 'text-[var(--color-text-muted)]'
            }
            sub="已平仓持仓合计"
          />
          <KpiCard
            label="平均决策分"
            value={
              avgScore != null ? (
                <span className="flex items-center gap-2">
                  {avgScore}
                  {avgGrade && <GradeBadge grade={avgGrade} />}
                </span>
              ) : '—'
            }
            sub={`共 ${stats?.totalTrades ?? 0} 笔交易`}
          />
          <KpiCard
            label="胜率"
            value={stats?.winRate != null ? `${stats.winRate.toFixed(1)}%` : '—'}
            sub="已平仓持仓中盈利比例"
          />
        </div>
      )}

      {/* ── Open positions table ── */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-medium text-[var(--color-text)]">开仓持仓</h2>
          {positions.length > 0 && (
            <span className="text-xs text-[var(--color-text-faint)]">{positions.length} 持</span>
          )}
        </div>

        {loading ? (
          <table className="w-full">
            <tbody>
              {[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        ) : positions.length === 0 ? (
          <EmptyPositions onNew={() => navigate('/trades/new')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {['标码 / 名称', '市场', '均成本', '持仓量', '总投入', '持仓天', ''].map(h => (
                    <th key={h} className="text-left text-xs font-medium text-[var(--color-text-muted)] px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => (
                  <tr
                    key={pos.id}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-offset)] transition-colors cursor-pointer"
                    onClick={() => navigate(`/positions/${pos.id}`)}
                  >
                    {/* 标码 + 名称 */}
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[var(--color-text)] tabular-nums tracking-wide">
                        {pos.ticker}
                      </span>
                      {pos.name && (
                        <span className="ml-2 text-xs text-[var(--color-text-muted)]">{pos.name}</span>
                      )}
                    </td>
                    {/* 市场 */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MARKET_COLOR[pos.market] ?? MARKET_COLOR.OTHER}`}>
                        {MARKET_LABEL[pos.market] ?? pos.market}
                      </span>
                    </td>
                    {/* 均成本 */}
                    <td className="px-4 py-3 tabular-nums text-[var(--color-text-muted)]">
                      {pos.avgCost ? Number(pos.avgCost).toFixed(3) : '—'}
                    </td>
                    {/* 持仓量 */}
                    <td className="px-4 py-3 tabular-nums text-[var(--color-text-muted)]">
                      {pos.currentQuantity?.toLocaleString() ?? '—'}
                    </td>
                    {/* 总投入 */}
                    <td className="px-4 py-3 tabular-nums text-[var(--color-text)]">
                      {pos.totalInvested ? fmt(Number(pos.totalInvested), pos.currency) : '—'}
                    </td>
                    {/* 持仓天 */}
                    <td className="px-4 py-3 tabular-nums text-[var(--color-text-faint)]">
                      {holdDays(pos.openedAt)}d
                    </td>
                    {/* 操作 */}
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); navigate('/trades/new') }}
                        className="text-xs text-teal-500 hover:text-teal-400 transition-colors"
                      >
                        加仓 / 卖出
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  )
}
