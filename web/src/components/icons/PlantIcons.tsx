/**
 * Custom, hand-built tomato plant-part icons (leaf, fruit, root, stem) — a small
 * bespoke set so the UI doesn't lean on generic icon-library glyphs. currentColor.
 */
interface IconProps {
  className?: string
  size?: number
}

const base = {
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function LeafIcon({ className, size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      <path d="M5 18.5C6 10.5 11 5.5 19 5c.4 8.2-4.8 13.4-12.6 13.6-.5 0-1 0-1.4-.1Z" fill="currentColor" fillOpacity={0.16} stroke="none" />
      <path d="M5.5 18.5C8.2 13 12.6 8.6 18.6 6" />
      <path d="M8.8 15.2l2.2.5M11.3 11.9l2.4.5M13.9 8.7l2.3.5" opacity={0.65} />
    </svg>
  )
}

export function FruitIcon({ className, size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      <path d="M12 8c4 0 7 2.7 7 6.2S15.9 20.4 12 20.4 5 17.7 5 14.2 8 8 12 8Z" fill="currentColor" fillOpacity={0.16} />
      <path d="M9.6 6.4C10.4 4.7 11 4 12 4s1.6.7 2.4 2.4" />
      <path d="M12 4.2c-1.5-.3-2.9.1-3.7 1.3M12 4.2c1.5-.3 2.9.1 3.7 1.3" opacity={0.8} />
      <path d="M9.2 12.5c.6-1 1.6-1.7 2.8-1.9" opacity={0.55} />
    </svg>
  )
}

export function RootIcon({ className, size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      <path d="M8.5 4.5c1.5 1 2.4 2 3.5 2s2-1 3.5-2" opacity={0.85} />
      <path d="M12 6v13" />
      <path d="M12 10.5c-1.6 1.4-2.6 3.7-3.2 6.8M12 12c1.6 1.4 2.6 3.4 3.2 6.4" />
      <path d="M8.8 16.6l-1.2 1.8M15.2 15.8l1.3 1.7" opacity={0.55} />
    </svg>
  )
}

export function StemIcon({ className, size = 22 }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} {...base}>
      <path d="M12 21V4.5" />
      <path d="M12 11.5C9.2 11.5 7.5 9.6 7.5 6.7c2.9 0 4.5 1.8 4.5 4.8Z" fill="currentColor" fillOpacity={0.16} />
      <path d="M12 8.5c2.4 0 3.9-1.6 3.9-4.1C13.5 4.4 12 6 12 8.5Z" fill="currentColor" fillOpacity={0.16} />
      <circle cx="12" cy="15" r="0.95" fill="currentColor" stroke="none" />
    </svg>
  )
}
