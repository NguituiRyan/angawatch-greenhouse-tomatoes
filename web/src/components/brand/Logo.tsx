import { cn } from '@/lib/cn'

/** AngaWatch mark — a leaf cradling an eye (watch + grow), in lime green. */
export function Logo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="grid h-9 w-9 place-items-center">
        <svg viewBox="0 0 36 36" className="h-9 w-9" fill="none" aria-hidden>
          <path
            d="M18 3C10 3 4 9 4 18c0 8 6 15 14 15 1.2 0 1.4-1.2 1.4-2.3C19.4 23 24 17 31 15c1.3-.4 1.2-1.4.6-2.4C28 6.5 23.6 3 18 3Z"
            fill="var(--c-lime)"
          />
          <path d="M11 22c4-7 9-11 17-13" stroke="var(--c-health-deep)" strokeWidth="1.6" strokeLinecap="round" />
          <ellipse cx="16.5" cy="16.5" rx="5.5" ry="4" fill="white" fillOpacity="0.9" />
          <circle cx="16.5" cy="16.5" r="2.3" fill="var(--c-ink)" />
          <circle cx="17.4" cy="15.6" r="0.7" fill="white" />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-xl font-bold tracking-tight text-ink">
          Anga<span className="text-lime">Watch</span>
        </span>
      )}
    </div>
  )
}
