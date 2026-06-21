import { useId } from 'react'
import { cn } from '@/lib/cn'

interface HealthRingProps {
  /** 0..100 */
  value: number
  size?: number
  stroke?: number
  label?: string
  className?: string
  showValue?: boolean
}

/** Circular progress ring (lime→green) with the % inside and the label below. */
export function HealthRing({
  value,
  size = 88,
  stroke = 9,
  label = 'Health Score',
  className,
  showValue = true,
}: HealthRingProps) {
  const id = useId()
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const offset = c - (pct / 100) * c

  return (
    <div className={cn('inline-flex flex-col items-center gap-1', className)}>
      <div className="relative grid place-items-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={`ring-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--c-lime)" />
              <stop offset="100%" stopColor="var(--c-health-deep)" />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(31,42,36,0.08)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#ring-${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1.1s ease-out',
              filter: 'drop-shadow(0 3px 8px rgba(111, 178, 62, 0.4))',
            }}
          />
        </svg>
        {showValue && (
          <span className="absolute text-lg font-bold leading-none text-health-deep">
            {Math.round(pct)}%
          </span>
        )}
      </div>
      {label && <span className="text-[11px] font-medium text-sage">{label}</span>}
    </div>
  )
}
