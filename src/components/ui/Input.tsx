import clsx from 'clsx'
import type { InputHTMLAttributes } from 'react'

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export default function Input({ label, error, hint, className, id, ...props }: Props) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-stone-400">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          'bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-100',
          'placeholder:text-stone-600 transition-colors',
          'focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/40',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/40',
          className,
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-stone-500">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
