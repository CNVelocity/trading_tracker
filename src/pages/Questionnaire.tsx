import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { api } from '@/lib/api'
import ScoreSlider from '@/components/ui/ScoreSlider'
import { Textarea } from '@/components/ui/Input'
import type { QuestionnaireTemplate, AnswerMap, QuestionAnswer } from '@/types'

// ── Grade helpers ──────────────────────────────────────────────────────────

function toGrade(score: number) {
  if (score >= 90) return 'S'
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  return 'D'
}

const GRADE_COLOR: Record<string, string> = {
  S: '#2dd4bf', A: '#4ade80', B: '#facc15', C: '#fb923c', D: '#f87171',
}
const GRADE_LABEL: Record<string, string> = {
  S: '极优', A: '良好', B: '及格', C: '较差', D: '资金保护',
}

// ── Score ring ────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const grade = toGrade(score)
  const color = GRADE_COLOR[grade]
  const r     = size / 2 - 6
  const circ  = 2 * Math.PI * r
  const dash  = circ * Math.min(score / 100, 1)
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="var(--color-surface-offset)" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth="5"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.5s cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <span className="absolute font-bold tabular-nums" style={{ color, fontSize: size * 0.22 }}>
        {score}
      </span>
    </div>
  )
}

// ── Bool toggle ────────────────────────────────────────────────────────────

function BoolToggle({
  questionKey, questionText, hint, maxScore, value, onChange,
}: {
  questionKey: string; questionText: string; hint?: string | null
  maxScore: number; value: boolean | undefined; onChange: (key: string, a: QuestionAnswer) => void
}) {
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">{questionText}</p>
        {hint && <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="flex gap-2">
        {[{ v: true, label: '是' }, { v: false, label: '否' }].map(({ v, label }) => (
          <button
            key={String(v)} type="button"
            onClick={() => onChange(questionKey, { boolValue: v, score: v ? maxScore : 0 })}
            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
              value === v
                ? 'border-teal-500 text-teal-400 bg-teal-500/10'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-faint)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Select question ─────────────────────────────────────────────────────────

interface SelectOpt { value: string; label: string; score: number }

function SelectQuestion({
  questionKey, questionText, hint, options, selected, onChange,
}: {
  questionKey: string; questionText: string; hint?: string | null
  options: SelectOpt[]; selected: string | undefined
  onChange: (key: string, a: QuestionAnswer) => void
}) {
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">{questionText}</p>
        {hint && <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="space-y-2">
        {options.map(opt => (
          <button
            key={opt.value} type="button"
            onClick={() => onChange(questionKey, { selected: opt.value, score: opt.score })}
            className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
              selected === opt.value
                ? 'border-teal-500 text-teal-400 bg-teal-500/10'
                : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-text-faint)]'
            }`}
          >
            <span>{opt.label}</span>
            <span className="text-xs text-[var(--color-text-faint)] tabular-nums">{opt.score}pt</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Result overlay ─────────────────────────────────────────────────────────

function ResultCard({
  score, direction, ticker, onDashboard, onPositions,
}: {
  score: number; direction: string; ticker?: string
  onDashboard: () => void; onPositions: () => void
}) {
  const grade = toGrade(score)
  const color = GRADE_COLOR[grade]
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 max-w-sm w-full mx-4 text-center space-y-5 shadow-2xl">
        <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest">决策评分完成</p>

        <div className="flex justify-center">
          <ScoreRing score={score} size={100} />
        </div>

        <div>
          <span
            className="text-4xl font-bold"
            style={{ color, fontFamily: 'var(--font-display)' }}
          >
            {grade}
          </span>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">{GRADE_LABEL[grade]}</p>
        </div>

        {ticker && (
          <p className="text-xs text-[var(--color-text-faint)]">
            {direction === 'BUY' ? '买入' : '卖出'} 
            <span className="font-medium text-[var(--color-text)]">{ticker}</span>
             的决策质量得分为 
            <span className="font-semibold tabular-nums" style={{ color }}>{score}</span> / 100
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onPositions}
            className="py-2.5 text-sm font-medium rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-faint)] transition-colors"
          >
            查看持仓
          </button>
          <button
            onClick={onDashboard}
            className="py-2.5 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white transition-colors"
          >
            返回 Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────

interface TradeWithPosition {
  id: string
  direction: 'BUY' | 'SELL'
  tradeDate: string
  price: string
  quantity: number
  position: { ticker: string; name: string | null }
}

export default function Questionnaire() {
  const { tradeId } = useParams<{ tradeId: string }>()
  const navigate    = useNavigate()
  const location    = useLocation()
  const locState    = (location.state ?? {}) as {
    direction?: 'BUY' | 'SELL'; ticker?: string; tradeDate?: string
  }

  const [trade,     setTrade]     = useState<TradeWithPosition | null>(null)
  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([])
  const [answers,   setAnswers]   = useState<AnswerMap>({})
  const [loading,   setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result,    setResult]    = useState<number | null>(null)

  useEffect(() => {
    if (!tradeId) return
    Promise.all([
      api.get<TradeWithPosition>(`/trades/${tradeId}`),
    ]).then(([t]) => {
      setTrade(t)
      return api.get<QuestionnaireTemplate[]>(`/questionnaires/templates?direction=${t.direction}`)
    }).then(tmpl => {
      setTemplates(tmpl)
      // Init SCORE answers to 0
      const init: AnswerMap = {}
      for (const t of templates) {
        if (t.questionType === 'SCORE') init[t.questionKey] = { score: 0 }
      }
      setAnswers(init)
    }).catch(console.error)
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId])

  // Re-init scores when templates arrive
  useEffect(() => {
    if (templates.length === 0) return
    setAnswers(prev => {
      const init: AnswerMap = {}
      for (const t of templates) {
        if (t.questionType === 'SCORE') {
          init[t.questionKey] = prev[t.questionKey] ?? { score: 0 }
        }
      }
      return { ...init, ...prev }
    })
  }, [templates])

  const handleScoreChange = useCallback((key: string, score: number) => {
    setAnswers(prev => ({ ...prev, [key]: { ...prev[key], score } }))
  }, [])

  const handleAnswerChange = useCallback((key: string, answer: QuestionAnswer) => {
    setAnswers(prev => ({ ...prev, [key]: answer }))
  }, [])

  const handleTextChange = useCallback((key: string, text: string) => {
    setAnswers(prev => ({ ...prev, [key]: { ...prev[key], text } }))
  }, [])

  const totalScore = Math.min(
    100,
    Math.round(Object.values(answers).reduce((s, a) => s + (a.score ?? 0), 0))
  )

  const direction = trade?.direction ?? locState.direction ?? 'BUY'
  const ticker    = trade?.position?.ticker ?? locState.ticker ?? ''

  const answered  = templates.filter(t => t.questionType !== 'TEXT').length
  const filled    = templates.filter(t => {
    if (t.questionType === 'TEXT') return true
    const a = answers[t.questionKey]
    return a !== undefined && (a.score !== undefined || a.boolValue !== undefined || a.selected !== undefined)
  }).length
  const progress  = answered > 0 ? Math.round((filled / answered) * 100) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !tradeId) return
    setSubmitting(true)
    try {
      await api.post('/questionnaires', {
        tradeId,
        direction,
        answers,
        totalScore,
      })
      setResult(totalScore)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl animate-pulse bg-[var(--color-surface-offset)]" />
        ))}
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <p className="text-sm text-[var(--color-text-muted)] mb-2">问卷模板尚未初始化</p>
        <p className="text-xs text-[var(--color-text-faint)] mb-6">请先运行数据库 seed 脚本</p>
        <button onClick={() => navigate('/dashboard')}
          className="text-xs text-teal-500 hover:text-teal-400">返回 Dashboard</button>
      </div>
    )
  }

  return (
    <>
      {result !== null && (
        <ResultCard
          score={result}
          direction={direction}
          ticker={ticker}
          onDashboard={() => navigate('/dashboard')}
          onPositions={() => navigate('/positions')}
        />
      )}

      <div className="max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text)]">决策评分</h1>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {direction === 'BUY' ? '买入' : '卖出'}
              {ticker && <span className="ml-1 font-medium text-[var(--color-text)]">{ticker}</span>}
              {trade?.position?.name && (
                <span className="ml-1 text-[var(--color-text-faint)]">· {trade.position.name}</span>
              )}
            </p>
          </div>
          <ScoreRing score={totalScore} size={64} />
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-[var(--color-text-faint)]">
            <span>已完成 {filled} / {answered} 题</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-[var(--color-surface-offset)] overflow-hidden">
            <div
              className="h-full rounded-full bg-teal-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Questions */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {templates.map(tmpl => {
            const ans = answers[tmpl.questionKey]

            if (tmpl.questionType === 'SCORE') {
              return (
                <ScoreSlider
                  key={tmpl.id}
                  questionKey={tmpl.questionKey}
                  questionText={tmpl.questionText}
                  hint={tmpl.hint}
                  maxScore={tmpl.maxScore ?? 10}
                  value={ans?.score ?? 0}
                  onChange={handleScoreChange}
                />
              )
            }

            if (tmpl.questionType === 'BOOL') {
              return (
                <BoolToggle
                  key={tmpl.id}
                  questionKey={tmpl.questionKey}
                  questionText={tmpl.questionText}
                  hint={tmpl.hint}
                  maxScore={tmpl.maxScore ?? 10}
                  value={ans?.boolValue}
                  onChange={handleAnswerChange}
                />
              )
            }

            if (tmpl.questionType === 'SELECT' && tmpl.options) {
              let opts: SelectOpt[] = []
              try { opts = JSON.parse(tmpl.options) } catch {}
              return (
                <SelectQuestion
                  key={tmpl.id}
                  questionKey={tmpl.questionKey}
                  questionText={tmpl.questionText}
                  hint={tmpl.hint}
                  options={opts}
                  selected={ans?.selected}
                  onChange={handleAnswerChange}
                />
              )
            }

            if (tmpl.questionType === 'TEXT') {
              return (
                <div key={tmpl.id} className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 space-y-2">
                  <p className="text-sm font-medium text-[var(--color-text)]">{tmpl.questionText}</p>
                  {tmpl.hint && <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{tmpl.hint}</p>}
                  <Textarea
                    placeholder="写下你的思考..."
                    value={ans?.text ?? ''}
                    onChange={e => handleTextChange(tmpl.questionKey, e.target.value)}
                  />
                </div>
              )
            }

            return null
          })}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-4 py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
            >
              返回
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white transition-colors"
            >
              {submitting ? '提交中…' : `提交问卷 — 当前得分 ${totalScore} 分`}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
