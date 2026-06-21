import { type ReactNode } from 'react'

// faint film grain (premium texture) as an inline SVG noise data-URI
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"

/**
 * Page frame: a soft neutral gradient washed with floating lime/emerald orbs, a
 * top sheen and a faint grain — the airy, premium agritech backdrop behind the
 * frosted-glass cards.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-[#E4EEDB] via-[#D7E6D0] to-[#C6DCC6]">
      {/* vivid floating colour orbs — give the frosted glass something to refract */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="animate-float-orb absolute -left-28 -top-28 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(163,203,56,0.55),transparent_62%)]" />
        <div
          className="animate-float-orb absolute -right-24 top-0 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(56,168,118,0.48),transparent_62%)]"
          style={{ animationDelay: '-6s' }}
        />
        <div
          className="animate-float-orb absolute bottom-[-12rem] left-[28%] h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,rgba(54,182,182,0.4),transparent_62%)]"
          style={{ animationDelay: '-11s' }}
        />
        <div
          className="animate-float-orb absolute right-[10%] bottom-[6%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(255,196,120,0.34),transparent_62%)]"
          style={{ animationDelay: '-3s' }}
        />
      </div>

      {/* top sheen */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-64"
        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.45), transparent)' }}
      />

      {/* film grain */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.035] mix-blend-soft-light"
        style={{ backgroundImage: GRAIN }}
      />

      <div className="relative mx-auto w-full max-w-[1240px] px-4 py-5 sm:px-6 sm:py-7">{children}</div>
    </div>
  )
}
