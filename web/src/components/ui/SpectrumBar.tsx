import { useId } from 'react'
import { cn } from '@/lib/cn'

interface SpectrumBarProps {
  /** values 0..1; bar height & colour-stop follow the value */
  values: number[]
  className?: string
  height?: number
  /** highlight bars below this suitability as "out of range" */
  showMarkers?: boolean
}

/**
 * The signature thin vertical-bar histogram with a left→right
 * red→amber→lime→green gradient. Used for the Climate Suitability Index
 * and the Area-prediction strip.
 */
export function SpectrumBar({
  values,
  className,
  height = 56,
  showMarkers = false,
}: SpectrumBarProps) {
  const id = useId()
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <div className="relative flex h-full w-full items-end gap-[3px]">
        {values.map((v, i) => {
          const clamped = Math.max(0.06, Math.min(1, v))
          // colour follows the value along the spectrum
          const color =
            clamped < 0.3
              ? 'var(--c-spectrum-red)'
              : clamped < 0.55
                ? 'var(--c-spectrum-amber)'
                : clamped < 0.78
                  ? 'var(--c-spectrum-lime)'
                  : 'var(--c-spectrum-green)'
          return (
            <div
              key={`${id}-${i}`}
              className="flex-1 rounded-full transition-[height] duration-500"
              style={{
                height: `${clamped * 100}%`,
                background: color,
                opacity: 0.92,
              }}
              title={`${Math.round(clamped * 100)}%`}
            >
              {showMarkers && clamped < 0.3 && (
                <span className="sr-only">out of range</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
