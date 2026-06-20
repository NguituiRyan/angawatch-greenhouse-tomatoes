import { type ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'neutral' | 'lime' | 'amber' | 'red' | 'ink'

const tones: Record<Tone, string> = {
  neutral: 'bg-white/60 text-sage',
  lime: 'bg-lime-tint text-health-deep',
  amber: 'bg-spectrum-amber/15 text-spectrum-amber',
  red: 'bg-spectrum-red/10 text-spectrum-red',
  ink: 'bg-ink text-white',
}

export function Pill({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
