import clsx from 'clsx'

interface Props {
  className?: string
  count?: number
}

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={clsx('skeleton h-4', className)} />
}

export function SkeletonCard({ className }: Props) {
  return (
    <div className={clsx('bg-stone-900 border border-stone-800 rounded-xl p-5 space-y-3', className)}>
      <SkeletonLine className="w-1/3" />
      <SkeletonLine className="w-2/3" />
      <SkeletonLine className="w-1/2" />
    </div>
  )
}

export default function Skeleton({ count = 3, className }: Props) {
  return (
    <div className={clsx('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
