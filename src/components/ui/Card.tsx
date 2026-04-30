import clsx from 'clsx'
import type { HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export default function Card({ padding = 'md', className, children, ...props }: Props) {
  return (
    <div
      className={clsx(
        'bg-stone-900 border border-stone-800 rounded-xl',
        padding === 'sm'  && 'p-3',
        padding === 'md'  && 'p-5',
        padding === 'lg'  && 'p-7',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
