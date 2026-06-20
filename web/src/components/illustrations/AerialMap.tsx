import { cn } from '@/lib/cn'

/**
 * Stylised aerial view of a greenhouse cluster — organic plot shapes, rows and
 * pathways — standing in for the satellite image in the reference farmland card.
 */
export function AerialMap({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 230" className={cn('h-full w-full', className)} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id="map-bg" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#3E5A2E" />
          <stop offset="100%" stopColor="#22351B" />
        </radialGradient>
        <linearGradient id="plot-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6FB23E" />
          <stop offset="100%" stopColor="#4C8A2C" />
        </linearGradient>
        <linearGradient id="plot-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#86C24A" />
          <stop offset="100%" stopColor="#5E9E34" />
        </linearGradient>
        <pattern id="rows" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <rect width="6" height="6" fill="transparent" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.4" />
        </pattern>
      </defs>

      {/* organic island landmass */}
      <path
        d="M44 70C40 40 90 18 150 22c58 4 120 8 130 56 8 40-18 70-58 92-44 24-96 40-140 22C44 174 20 130 30 100c4-12 12-20 14-30Z"
        fill="url(#map-bg)"
      />

      {/* cultivated plots */}
      <g>
        <path d="M72 64c30-12 64-12 86 2 8 6 4 22-10 30-26 14-58 16-78 4-12-8-10-30 2-36Z" fill="url(#plot-a)" />
        <path d="M72 64c30-12 64-12 86 2 8 6 4 22-10 30-26 14-58 16-78 4-12-8-10-30 2-36Z" fill="url(#rows)" />

        <path d="M178 60c26-6 56-2 70 12 8 8 2 24-14 30-22 8-48 8-64-2-12-8-10-34 8-40Z" fill="url(#plot-b)" />
        <path d="M178 60c26-6 56-2 70 12 8 8 2 24-14 30-22 8-48 8-64-2-12-8-10-34 8-40Z" fill="url(#rows)" />

        <path d="M64 122c28-8 60-6 80 6 10 8 6 26-12 34-28 12-62 12-84-2-12-8-6-32 16-38Z" fill="url(#plot-b)" />
        <path d="M64 122c28-8 60-6 80 6 10 8 6 26-12 34-28 12-62 12-84-2-12-8-6-32 16-38Z" fill="url(#rows)" />

        <path d="M176 118c28-6 60 0 74 16 8 10 0 26-18 32-26 8-54 6-70-6-12-10-8-36 14-42Z" fill="url(#plot-a)" />
        <path d="M176 118c28-6 60 0 74 16 8 10 0 26-18 32-26 8-54 6-70-6-12-10-8-36 14-42Z" fill="url(#rows)" />
      </g>

      {/* pathways */}
      <path d="M40 110C110 96 210 96 286 116" stroke="#C9B38A" strokeOpacity="0.5" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M160 30C150 90 150 150 158 200" stroke="#C9B38A" strokeOpacity="0.4" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* tree dots */}
      {[
        [54, 90],
        [262, 92],
        [50, 150],
        [266, 150],
        [120, 200],
        [205, 198],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="5" fill="#2F4A22" stroke="#557A3A" strokeWidth="1.5" />
      ))}
    </svg>
  )
}
