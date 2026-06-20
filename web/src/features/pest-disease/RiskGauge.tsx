import { useId } from 'react'
import type { RiskLevel } from '@/api/types'
import { cn } from '@/lib/cn'

const LEVEL_COLOR: Record<RiskLevel, string> = {
  low: 'var(--c-health-deep)',
  watch: 'var(--c-spectrum-amber)',
  high: 'var(--c-spectrum-red)',
}
const LEVEL_LABEL: Record<RiskLevel, string> = { low: 'Low', watch: 'Watch', high: 'High' }

/** 180° arc gauge for a normalised 0..100 risk score. */
export function RiskGauge({
  score,
  level,
  size = 168,
}: {
  score: number
  level: RiskLevel
  size?: number
}) {
  const id = useId()
  const stroke = 14
  const r = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = Math.PI * r // half circle
  const pct = Math.max(0, Math.min(100, score)) / 100
  const color = LEVEL_COLOR[level]

  // semicircle path from left (180°) to right (0°)
  const arc = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`

  return (
    <div className="relative" style={{ width: size, height: size / 2 + 18 }}>
      <svg width={size} height={size / 2 + 18} viewBox={`0 0 ${size} ${size / 2 + 18}`}>
        <path d={arc} fill="none" stroke="rgba(31,42,36,0.08)" strokeWidth={stroke} strokeLinecap="round" />
        <path
          d={arc}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          key={id}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="text-2xl font-bold leading-none" style={{ color }}>
          {Math.round(score)}
        </div>
        <div className={cn('mt-0.5 text-[11px] font-semibold uppercase tracking-wide')} style={{ color }}>
          {LEVEL_LABEL[level]}
        </div>
      </div>
    </div>
  )
}
