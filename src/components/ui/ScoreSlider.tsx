import { cn } from '@/lib/utils'

interface ScoreSliderProps {
  questionKey: string
  questionText: string
  hint?: string | null
  maxScore: number
  value: number
  onChange: (key: string, score: number) => void
}

export default function ScoreSlider({
  questionKey,
  questionText,
  hint,
  maxScore,
  value,
  onChange,
}: ScoreSliderProps) {
  const pct = maxScore > 0 ? (value / maxScore) * 100 : 0

  const trackColor =
    pct >= 80 ? 'text-teal-400' :
    pct >= 60 ? 'text-green-400' :
    pct >= 40 ? 'text-yellow-400' :
    pct >= 20 ? 'text-orange-400' : 'text-red-400'

  return (
    <div className="bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--color-text)]">{questionText}</p>
          {hint && <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{hint}</p>}
        </div>
        <span
          className={cn('text-xl font-bold tabular-nums leading-none min-w-[2.5rem] text-right', trackColor)}
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {value}
          <span className="text-xs text-[var(--color-text-faint)] font-normal">/{maxScore}</span>
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={maxScore}
        step={1}
        value={value}
        onChange={(e) => onChange(questionKey, parseInt(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-[var(--color-border)] cursor-pointer accent-teal-500"
      />

      <div className="flex justify-between text-xs text-[var(--color-text-faint)]">
        <span>0</span>
        <span>{Math.round(maxScore / 2)}</span>
        <span>{maxScore}</span>
      </div>
    </div>
  )
}
