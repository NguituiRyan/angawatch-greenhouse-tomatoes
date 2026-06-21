import { cn } from '@/lib/cn'

interface SegmentedNavProps<T extends string> {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}

/** Top-nav segmented control — active tab gets the lime pill (per the design). */
export function SegmentedNav<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedNavProps<T>) {
  return (
    <div
      className={cn(
        'glass inline-flex items-center gap-0.5 rounded-full p-1',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all',
              active
                ? 'bg-white text-ink shadow-pill'
                : 'text-sage hover:text-ink',
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
