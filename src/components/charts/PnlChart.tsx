import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts'

interface DataPoint {
  month: string
  pnl: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const val = payload[0].value as number
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-xs">
      <p className="text-[var(--color-text-muted)] mb-1">{label}</p>
      <p className={val >= 0 ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
        {val >= 0 ? '+' : ''}¥{val.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
      </p>
    </div>
  )
}

export default function PnlChart({ data }: { data: DataPoint[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--color-text-faint)] text-sm">
        还没有已实现盈亏数据
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <XAxis
          dataKey="month"
          tick={{ fill: '#5a5957', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#5a5957', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${v >= 0 ? '+' : ''}¥${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <ReferenceLine y={0} stroke="#393836" />
        <Bar dataKey="pnl" radius={[3, 3, 0, 0]} maxBarSize={32}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.pnl >= 0 ? '#6daa45' : '#dd6974'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
