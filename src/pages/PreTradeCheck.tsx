import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/lib/api'
import ScoreSlider from '@/components/ui/ScoreSlider'
import { Textarea } from '@/components/ui/Input'
import type { QuestionnaireTemplate, AnswerMap, QuestionAnswer } from '@/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function toGrade(s: number) {
  if (s >= 90) return 'S'
  if (s >= 75) return 'A'
  if (s >= 60) return 'B'
  if (s >= 45) return 'C'
  return 'D'
}
const GRADE_COLOR: Record<string, string> = {
  S: '#2dd4bf', A: '#4ade80', B: '#facc15', C: '#fb923c', D: '#f87171',
}
const GRADE_LABEL: Record<string, string> = {
  S: '极优 — 强烈信号，可以行动',
  A: '良好 — 分析充分，审慎行动',
  B: '及格 — 有欠缺，考虑等待',
  C: '较差 — 明显盲点，建议暂缓',
  D: '危险 — 冲动交易，请三思',
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const grade = toGrade(score)
  const color = GRADE_COLOR[grade]
  const r     = size / 2 - 6
  const circ  = 2 * Math.PI * r
  const dash  = circ * (score / 100)
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

function BoolToggle({ questionKey, questionText, hint, maxScore, value, onChange }: {
  questionKey: string; questionText: string; hint?: string | null
  maxScore: number; value: boolean | undefined
  onChange: (key: string, a: QuestionAnswer) => void
}) {
  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-[var(--color-text)]">{questionText}</p>
        {hint && <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{hint}</p>}
      </div>
      <div className="flex gap-2">
        {([{ v: true, label: '是' }, { v: false, label: '否' }] as const).map(({ v, label }) => (
          <button key={String(v)} type="button"
            onClick={() => onChange(questionKey, { boolValue: v, score: v ? maxScore : 0 })}
            className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
              value === v
                ? 'border-teal-500 text-teal-400 bg-teal-500/10'
                : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-faint)]'
            }`}>{label}</button>
        ))}
      </div>
    </div>
  )
}

interface SelectOpt { value: string; label: string; score: number }
function SelectQuestion({ questionKey, questionText, hint, options, selected, onChange }: {
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
          <button key={opt.value} type="button"
            onClick={() => onChange(questionKey, { selected: opt.value, score: opt.score })}
            className={`w-full flex items-center justify-between text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
              selected === opt.value
                ? 'border-teal-500 text-teal-400 bg-teal-500/10'
                : 'border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-text-faint)]'
            }`}>
            <span>{opt.label}</span>
            <span className="text-xs text-[var(--color-text-faint)] tabular-nums">{opt.score}pt</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Result overlay ────────────────────────────────────────────────────────────

function ResultCard({ score, direction, ticker, questionnaireId, onDiscard }: {
  score: number
  direction: 'BUY' | 'SELL'
  ticker: string
  questionnaireId: string
  onDiscard: () => void
}) {
  const navigate = useNavigate()
  const grade    = toGrade(score)
  const color    = GRADE_COLOR[grade]

  function proceed() {
    navigate('/trades/new', {
      state: {
        preQuestionnaireId: questionnaireId,
        preGrade:           grade,
        preScore:           score,
        direction,
        ticker,
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-8 max-w-sm w-full mx-4 text-center space-y-5 shadow-2xl">
        <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest">思考问卷完成</p>

        <div className="flex justify-center"><ScoreRing score={score} size={100} /></div>

        <div>
          <span className="text-5xl font-bold" style={{ color, fontFamily: 'var(--font-display)' }}>
            {grade}
          </span>
          <p className="text-sm text-[var(--color-text-muted)] mt-2 leading-relaxed max-w-[22ch] mx-auto">
            {GRADE_LABEL[grade]}
          </p>
        </div>

        {ticker && (
          <p className="text-xs text-[var(--color-text-faint)]">
            {direction === 'BUY' ? '拟买入' : '拟卖出'}&#8194;
            <span className="font-semibold text-[var(--color-text)]">{ticker.toUpperCase()}</span>
            &#8194;决策质量得分&#8194;
            <span className="font-bold tabular-nums" style={{ color }}>{score}</span> / 100
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onDiscard}
            className="py-2.5 text-sm font-medium rounded-xl border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:border-[var(--color-text-faint)] transition-colors"
          >
            暂不交易
          </button>
          <button
            onClick={proceed}
            className="py-2.5 text-sm font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white transition-colors"
          >
            记录{direction === 'BUY' ? '买入' : '卖出'} →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PreTradeCheck() {
  const navigate      = useNavigate()
  const [searchParams] = useSearchParams()

  const [direction, setDirection] = useState<'BUY' | 'SELL'>(
    (searchParams.get('direction') as 'BUY' | 'SELL') ?? 'BUY'
  )
  const [ticker,    setTicker]    = useState(searchParams.get('ticker') ?? '')
  const [templates, setTemplates] = useState<QuestionnaireTemplate[]>([])
  const [answers,   setAnswers]   = useState<AnswerMap>({})
  const [loading,   setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ id: string; score: number } | null>(null)

  useEffect(() => {
    setLoading(true)
    api.get<QuestionnaireTemplate[]>(`/questionnaires/templates?direction=${direction}`)
      .then(tmpl => {
        setTemplates(tmpl)
        setAnswers(prev => {
          const init: AnswerMap = {}
          for (const t of tmpl) {
            if (t.questionType === 'SCORE') {
              init[t.questionKey] = prev[t.questionKey] ?? { score: 0 }
            }
          }
          return init
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [direction])

  const handleScore  = useCallback((key: string, score: number) => {
    setAnswers(p => ({ ...p, [key]: { ...p[key], score } }))
  }, [])
  const handleAnswer = useCallback((key: string, a: QuestionAnswer) => {
    setAnswers(p => ({ ...p, [key]: a }))
  }, [])
  const handleText   = useCallback((key: string, text: string) => {
    setAnswers(p => ({ ...p, [key]: { ...p[key], text } }))
  }, [])

  const totalScore = Math.min(
    100,
    Math.round(Object.values(answers).reduce((s, a) => s + (a.score ?? 0), 0))
  )

  const scoreable = templates.filter(t => t.questionType !== 'TEXT').length
  const filled    = templates.filter(t => {
    if (t.questionType === 'TEXT') return true
    const a = answers[t.questionKey]
    return a !== undefined && (a.score !== undefined || a.boolValue !== undefined || a.selected !== undefined)
  }).length
  const progress = scoreable > 0 ? Math.round((filled / scoreable) * 100) : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    try {
      const created = await api.post<{ id: string; totalScore: number }>('/questionnaires', {
        direction,
        ticker:     ticker.trim() || null,
        answers,
        totalScore,
        // no tradeId → pre-trade mode
      })
      setResult({ id: created.id, score: created.totalScore })
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {result && (
        <ResultCard
          score={result.score}
          direction={direction}
          ticker={ticker}
          questionnaireId={result.id}
          onDiscard={() => navigate('/dashboard')}
        />
      )}

      <div className="max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <h1 className="text-lg font-semibold text-[var(--color-text)]">交易前思考</h1>
          </div>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">
            在下单之前，用这份问卷评估你的决策质量。<br />
            完成后你可以选择继续记录交易，或者暂时放弃。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Direction + Ticker */}
          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-3">
            <p className="text-[10px] font-semibold text-[var(--color-text-faint)] uppercase tracking-widest">你在考虑</p>
            <div className="flex p-1 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]">
              {(['BUY', 'SELL'] as const).map(d => (
                <button key={d} type="button"
                  onClick={() => setDirection(d)}
                  className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                    direction === d
                      ? d === 'BUY'
                        ? 'bg-teal-600 text-white shadow'
                        : 'bg-red-600 text-white shadow'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  }`}>
                  {d === 'BUY' ? '买入' : '卖出'}
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs text-[var(--color-text-muted)] mb-1.5">股票代码（可选）</label>
              <input
                type="text"
                placeholder="600000 / AAPL / 00700"
                value={ticker}
                onChange={e => setTicker(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-surface-offset)] border border-[var(--color-border)] text-[var(--color-text)] placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-teal-500 transition-colors font-mono tracking-wider"
              />
            </div>
          </div>

          {/* Live score + progress */}
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-xs text-[var(--color-text-faint)]">
                <span>已填 {filled} / {scoreable} 题</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1 rounded-full bg-[var(--color-surface-offset)] overflow-hidden">
                <div className="h-full rounded-full bg-teal-500 transition-all duration-300"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>
            <ScoreRing score={totalScore} size={52} />
          </div>

          {/* Questions */}
          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl animate-pulse bg-[var(--color-surface-offset)]" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map(tmpl => {
                const ans = answers[tmpl.questionKey]

                if (tmpl.questionType === 'SCORE') return (
                  <ScoreSlider key={tmpl.id}
                    questionKey={tmpl.questionKey}
                    questionText={tmpl.questionText}
                    hint={tmpl.hint}
                    maxScore={tmpl.maxScore ?? 10}
                    value={ans?.score ?? 0}
                    onChange={handleScore}
                  />
                )

                if (tmpl.questionType === 'BOOL') return (
                  <BoolToggle key={tmpl.id}
                    questionKey={tmpl.questionKey}
                    questionText={tmpl.questionText}
                    hint={tmpl.hint}
                    maxScore={tmpl.maxScore ?? 10}
                    value={ans?.boolValue}
                    onChange={handleAnswer}
                  />
                )

                if (tmpl.questionType === 'SELECT' && tmpl.options) {
                  let opts: SelectOpt[] = []
                  try { opts = JSON.parse(tmpl.options) } catch {}
                  return (
                    <SelectQuestion key={tmpl.id}
                      questionKey={tmpl.questionKey}
                      questionText={tmpl.questionText}
                      hint={tmpl.hint}
                      options={opts}
                      selected={ans?.selected}
                      onChange={handleAnswer}
                    />
                  )
                }

                if (tmpl.questionType === 'TEXT') return (
                  <div key={tmpl.id} className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 space-y-2">
                    <p className="text-sm font-medium text-[var(--color-text)]">{tmpl.questionText}</p>
                    {tmpl.hint && <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{tmpl.hint}</p>}
                    <Textarea
                      placeholder="写下你的思考..."
                      value={ans?.text ?? ''}
                      onChange={e => handleText(tmpl.questionKey, e.target.value)}
                    />
                  </div>
                )

                return null
              })}
            </div>
          )}

          {/* Actions */}
          {!loading && templates.length > 0 && (
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => navigate(-1)}
                className="px-4 py-2.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                取消
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white transition-colors">
                {submitting ? '提交中…' : `完成思考 — 当前 ${totalScore} 分`}
              </button>
            </div>
          )}
        </form>
      </div>
    </>
  )
}
