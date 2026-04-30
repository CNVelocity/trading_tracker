import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom'
import { api } from '@/lib/api'
import Input, { Select, Textarea } from '@/components/ui/Input'
import type { Position, TradeRecord } from '@/types'

type PosMode = 'new_position' | 'existing_position'

const MARKET_OPTIONS = [
  { value: 'A_SHARE', label: 'A 股' },
  { value: 'HK',      label: '港股' },
  { value: 'US',      label: '美股' },
  { value: 'ETF',     label: 'ETF' },
  { value: 'OTHER',   label: '其他' },
]

const GRADE_COLOR: Record<string, string> = {
  S: '#2dd4bf', A: '#4ade80', B: '#facc15', C: '#fb923c', D: '#f87171',
}

interface LocationState {
  preQuestionnaireId?: string
  preGrade?: string
  preScore?: number
  direction?: 'BUY' | 'SELL'
  ticker?: string
}

export default function NewTrade() {
  const navigate       = useNavigate()
  const location       = useLocation()
  const [searchParams] = useSearchParams()
  const locState       = (location.state ?? {}) as LocationState

  const presetPositionId    = searchParams.get('positionId') ?? ''
  const preQuestionnaireId  = locState.preQuestionnaireId ?? null
  const preGrade            = locState.preGrade ?? null
  const preScore            = locState.preScore ?? null

  // ── Direction (can be pre-filled from pre-check)
  const [direction, setDirection] = useState<'BUY' | 'SELL'>(locState.direction ?? 'BUY')
  // ── Position
  const [posMode, setPosMode] = useState<PosMode>(
    presetPositionId ? 'existing_position' : 'new_position'
  )
  const [openPositions,  setOpenPositions]  = useState<Position[]>([])
  const [selectedPosId,  setSelectedPosId]  = useState(presetPositionId)
  // ── New position fields
  const [ticker,   setTicker]   = useState(locState.ticker ?? '')
  const [posName,  setPosName]  = useState('')
  const [market,   setMarket]   = useState('A_SHARE')
  const [currency, setCurrency] = useState('CNY')
  // ── Trade fields
  const today = new Date().toISOString().split('T')[0]
  const [tradeDate,  setTradeDate]  = useState(today)
  const [price,      setPrice]      = useState('')
  const [quantity,   setQuantity]   = useState('')
  const [commission, setCommission] = useState('0')
  const [notes,      setNotes]      = useState('')
  // ── UI
  const [submitting, setSubmitting] = useState(false)
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  useEffect(() => {
    api.get<Position[]>('/positions?status=OPEN').then(setOpenPositions).catch(console.error)
  }, [])

  useEffect(() => {
    if (direction === 'SELL') setPosMode('existing_position')
  }, [direction])

  useEffect(() => {
    if (market === 'HK')      setCurrency('HKD')
    else if (market === 'US') setCurrency('USD')
    else                      setCurrency('CNY')
  }, [market])

  const selectedPos  = openPositions.find(p => p.id === selectedPosId)
  const totalAmount  = price && quantity
    ? (Number(price) * Number(quantity)).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null

  function validate() {
    const e: Record<string, string> = {}
    if (posMode === 'new_position' && !ticker.trim()) e.ticker   = '请填写股票代码'
    if (posMode === 'existing_position' && !selectedPosId) e.position = '请选择持仓'
    if (!price    || Number(price)    <= 0) e.price    = '请填写有效价格'
    if (!quantity || Number(quantity) <= 0) e.quantity = '请填写有效数量'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate() || submitting) return
    setSubmitting(true)
    try {
      let positionId = selectedPosId

      if (posMode === 'new_position') {
        const pos = await api.post<Position>('/positions', {
          ticker:   ticker.toUpperCase().trim(),
          name:     posName.trim() || null,
          market,
          currency,
          openedAt: tradeDate,
        })
        positionId = pos.id
      }

      const tradeCurrency = posMode === 'new_position'
        ? currency
        : (selectedPos?.currency ?? 'CNY')

      const trade = await api.post<TradeRecord>('/trades', {
        positionId,
        direction,
        tradeDate,
        price:               Number(price).toFixed(4),
        quantity:            parseInt(quantity),
        commission:          Number(commission || '0').toFixed(4),
        currency:            tradeCurrency,
        notes:               notes.trim() || null,
        // Link pre-trade questionnaire if it exists
        preQuestionnaireId:  preQuestionnaireId ?? undefined,
      })

      // If pre-questionnaire was done, skip the post-questionnaire step
      if (preQuestionnaireId) {
        navigate('/positions')
      } else {
        navigate(`/trades/${trade.id}/questionnaire`, {
          state: {
            direction,
            ticker: posMode === 'new_position' ? ticker.toUpperCase().trim() : selectedPos?.ticker,
            name:   posMode === 'new_position' ? posName.trim() : selectedPos?.name,
            tradeDate, price, quantity,
          },
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-text)]">记录交易</h1>
          <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {preQuestionnaireId
              ? '思考问卷已完成，填写交易明细后即可提交'
              : '填写后将引导你完成决策评分问卷'}
          </p>
        </div>
        {!preQuestionnaireId && (
          <Link
            to="/questionnaire/pre"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-faint)] transition-colors"
          >
            <span>🧠</span> 先思考
          </Link>
        )}
      </div>

      {/* Pre-check banner */}
      {preQuestionnaireId && preGrade && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl border"
          style={{
            borderColor: GRADE_COLOR[preGrade] + '55',
            background:  GRADE_COLOR[preGrade] + '12',
          }}
        >
          <span className="text-xl font-bold" style={{ color: GRADE_COLOR[preGrade] }}>{preGrade}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-text)]">
              思考问卷已完成&ensp;·&ensp;
              <span className="tabular-nums" style={{ color: GRADE_COLOR[preGrade] }}>{preScore} 分</span>
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">提交交易后将自动关联此问卷</p>
          </div>
          <Link
            to="/questionnaire/pre"
            className="text-xs text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] transition-colors"
          >
            重做
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Direction toggle */}
        <div className="flex p-1 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          {(['BUY', 'SELL'] as const).map(d => (
            <button key={d} type="button"
              onClick={() => setDirection(d)}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                direction === d
                  ? d === 'BUY' ? 'bg-teal-600 text-white shadow' : 'bg-red-600 text-white shadow'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`}>
              {d === 'BUY' ? '买入  BUY' : '卖出  SELL'}
            </button>
          ))}
        </div>

        {/* Mode toggle (BUY only) */}
        {direction === 'BUY' && (
          <div className="flex gap-2">
            {(['new_position', 'existing_position'] as const).map(m => (
              <button key={m} type="button"
                onClick={() => setPosMode(m)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  posMode === m
                    ? 'border-teal-500 text-teal-400 bg-teal-500/10'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-faint)]'
                }`}>
                {m === 'new_position' ? '＋ 新建持仓' : '↗︎ 加仓现有'}
              </button>
            ))}
          </div>
        )}

        {/* New position panel */}
        {posMode === 'new_position' && (
          <div className="space-y-3 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <p className="text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-widest">新建持仓</p>
            <div className="grid grid-cols-2 gap-3">
              <Input label="股票代码" placeholder="600000 / AAPL"
                value={ticker} onChange={e => setTicker(e.target.value)} error={errors.ticker} />
              <Input label="名称（可选）" placeholder="浦发银行"
                value={posName} onChange={e => setPosName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select label="市场" value={market} onChange={e => setMarket(e.target.value)}>
                {MARKET_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
              <Select label="货币" value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="CNY">CNY 人民币</option>
                <option value="HKD">HKD 港元</option>
                <option value="USD">USD 美元</option>
              </Select>
            </div>
          </div>
        )}

        {/* Existing position */}
        {posMode === 'existing_position' && (
          <div className="space-y-2">
            <Select
              label={direction === 'SELL' ? '选择卖出的持仓' : '选择加仓的持仓'}
              value={selectedPosId}
              onChange={e => setSelectedPosId(e.target.value)}
              error={errors.position}
            >
              <option value="">— 请选择 —</option>
              {openPositions.map(p => (
                <option key={p.id} value={p.id}>
                  {p.ticker}{p.name ? ` · ${p.name}` : ''}
                  {' '}({p.currentQuantity?.toLocaleString() ?? '?'} 股 @ {Number(p.avgCost ?? 0).toFixed(2)})
                </option>
              ))}
            </Select>
            {selectedPos && (
              <div className="flex gap-5 px-3 py-2 rounded-lg bg-[var(--color-surface-offset)] text-xs text-[var(--color-text-muted)]">
                <span>均成本&nbsp;<b className="text-[var(--color-text)]">{Number(selectedPos.avgCost ?? 0).toFixed(3)}</b></span>
                <span>持仓量&nbsp;<b className="text-[var(--color-text)]">{selectedPos.currentQuantity?.toLocaleString()}</b></span>
                <span>总投入&nbsp;<b className="text-[var(--color-text)]">¥{Number(selectedPos.totalInvested ?? 0).toFixed(0)}</b></span>
              </div>
            )}
          </div>
        )}

        {/* Trade details */}
        <div className="space-y-3 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
          <p className="text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-widest">交易明细</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="交易日期" type="date" value={tradeDate} onChange={e => setTradeDate(e.target.value)} />
            <Input label="成交价格" type="number" step="0.001" min="0" placeholder="0.000"
              value={price} onChange={e => setPrice(e.target.value)} error={errors.price} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="数量（股）" type="number" step="1" min="1" placeholder="100"
              value={quantity} onChange={e => setQuantity(e.target.value)} error={errors.quantity} />
            <Input label="手续费" type="number" step="0.01" min="0" placeholder="0.00"
              value={commission} onChange={e => setCommission(e.target.value)} />
          </div>
          {totalAmount && (
            <div className="px-3 py-2 rounded-lg bg-[var(--color-surface-offset)] text-xs flex items-center gap-1.5 text-[var(--color-text-muted)]">
              成交金额&nbsp;
              <span className="font-semibold text-[var(--color-text)]">
                {selectedPos?.currency === 'HKD' ? 'HK$' : selectedPos?.currency === 'USD' ? '$' : '¥'}
                {totalAmount}
              </span>
            </div>
          )}
          <Textarea label="备注（可选）" placeholder="买入理由、市场环境、特殊情况..."
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={() => navigate(-1)}
            className="px-4 py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
            取消
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white transition-colors">
            {submitting
              ? '提交中…'
              : preQuestionnaireId
                ? '提交交易'
                : '下一步 → 填写决策问卷'}
          </button>
        </div>
      </form>
    </div>
  )
}
