import { cn } from '@/lib/cn'

interface DeltaPillProps {
  value: number // e.g. 15 -> "+15%"
  className?: string
  suffix?: string
}

/** The small lime "+15%" delta badge from the reference design. */
export function DeltaPill({ value, className, suffix = '%' }: DeltaPillProps) {
  const positive = value >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none',
        positive ? 'bg-lime-tint text-health-deep' : 'bg-spectrum-red/10 text-spectrum-red',
        className,
      )}
    >
      {positive ? '+' : ''}
      {value}
      {suffix}
    </span>
  )
}
