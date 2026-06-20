import { cn } from '@/lib/cn'

/**
 * Clean SVG tomato leaf with midrib + lateral veins and a two-tone fold,
 * echoing the photographed leaf at the centre of the reference design.
 * Rendered as crisp vector so it stays sharp and works fully offline.
 */
export function TomatoLeaf({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 360" className={cn('drop-shadow-[0_18px_40px_rgba(31,42,36,0.18)]', className)} fill="none" aria-hidden>
      <defs>
        <linearGradient id="leaf-top" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#B6D95B" />
          <stop offset="55%" stopColor="#8FC53F" />
          <stop offset="100%" stopColor="#6FB23E" />
        </linearGradient>
        <linearGradient id="leaf-bottom" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7FBE3C" />
          <stop offset="100%" stopColor="#5C9E34" />
        </linearGradient>
        <linearGradient id="leaf-shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.5" />
          <stop offset="40%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* leaf body: an elongated tomato leaflet with a slightly serrated edge */}
      <path
        d="M130 8C92 40 60 92 56 168c-3 64 22 128 74 184 52-56 77-120 74-184-4-76-36-128-74-160Z"
        fill="url(#leaf-top)"
      />
      {/* lower-half fold, darker, like the reference */}
      <path
        d="M130 352c-40-44-64-94-71-150 22 26 47 44 71 52v98Z"
        fill="url(#leaf-bottom)"
        opacity="0.9"
      />
      {/* specular sheen */}
      <path
        d="M130 8C92 40 60 92 56 168c-3 64 22 128 74 184 0 0-44-92-40-184C93 86 110 40 130 8Z"
        fill="url(#leaf-shine)"
      />

      {/* midrib */}
      <path d="M130 14C124 120 124 250 130 350" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M130 14C124 120 124 250 130 350" stroke="#4F8E2F" strokeOpacity="0.35" strokeWidth="1" strokeLinecap="round" />

      {/* lateral veins */}
      {Array.from({ length: 9 }, (_, i) => {
        const y = 50 + i * 32
        const len = 36 + Math.sin((i / 9) * Math.PI) * 26
        return (
          <g key={i} stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round">
            <path d={`M128 ${y} C ${128 - len * 0.6} ${y + 4}, ${128 - len} ${y + 12}, ${128 - len} ${y + 26}`} />
            <path d={`M132 ${y} C ${132 + len * 0.6} ${y + 4}, ${132 + len} ${y + 12}, ${132 + len} ${y + 26}`} />
          </g>
        )
      })}
    </svg>
  )
}
