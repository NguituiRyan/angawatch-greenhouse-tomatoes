import { cn } from '@/lib/cn'

/** The dark rounded "AI · Insights" pill from the Health Tracking card. */
export function AIInsightsPill({
  label = 'Insights',
  onClick,
  className,
}: {
  label?: string
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-medium text-white transition hover:bg-ink/90',
        className,
      )}
    >
      <span className="grid h-4 w-4 place-items-center rounded-[5px] bg-lime text-[9px] font-bold text-ink">
        AI
      </span>
      {label}
    </button>
  )
}
