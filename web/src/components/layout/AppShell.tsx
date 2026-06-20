import { type ReactNode } from 'react'

/**
 * Page frame: soft neutral gradient with an optional blurred greenhouse photo
 * sitting behind the frosted cards (as in reference image 1).
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-page-from to-page-to">
      {/* ambient blurred field/greenhouse wash */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(60% 50% at 70% 18%, rgba(163,203,56,0.18), transparent 70%),' +
            'radial-gradient(55% 45% at 18% 80%, rgba(111,178,62,0.16), transparent 70%)',
        }}
      />
      <div className="relative mx-auto w-full max-w-[1240px] px-4 py-5 sm:px-6 sm:py-7">
        {children}
      </div>
    </div>
  )
}
