import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import Card from '@/components/ui/Card'
import { SkeletonCard } from '@/components/ui/Skeleton'
import type { DashboardStats } from '@/types'

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<DashboardStats>('/stats')
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-medium text-stone-100">看板</h1>
        <p className="text-sm text-stone-500 mt-0.5">交易概览与决策质量</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="开仓数量" value={String(stats?.openPositionsCount ?? 0)} />
          <StatCard
            label="平均决策分"
            value={stats?.avgDecisionScore != null ? String(stats.avgDecisionScore) : '—'}
          />
          {/* Additional KPI cards added in Phase 2 */}
          <StatCard label="总交易次数" value="—" muted />
          <StatCard label="胜率" value="—" muted />
        </div>
      )}

      {/* Placeholder sections — filled in Phase 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <p className="text-sm text-stone-500">持仓列表 — Phase 2 实现</p>
        </Card>
        <Card>
          <p className="text-sm text-stone-500">决策分趋势图 — Phase 2 实现</p>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  muted = false,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <Card>
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold tabular-nums ${muted ? 'text-stone-600' : 'text-stone-100'}`}>
        {value}
      </p>
    </Card>
  )
}
