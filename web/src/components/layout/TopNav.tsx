import { Bell } from 'lucide-react'
import { Logo } from '@/components/brand/Logo'
import { SegmentedNav } from '@/components/ui/SegmentedNav'
import { Avatar } from '@/components/ui/Avatar'
import type { TabKey } from '@/App'

const TABS: { value: TabKey; label: string }[] = [
  { value: 'management', label: 'Management' },
  { value: 'crop-report', label: 'Crop Report' },
  { value: 'pest-disease', label: 'Pest & Disease' },
]

interface TopNavProps {
  active: TabKey
  onChange: (t: TabKey) => void
  alertCount: number
}

export function TopNav({ active, onChange, alertCount }: TopNavProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <Logo />

      <SegmentedNav options={TABS} value={active} onChange={onChange} className="hidden md:inline-flex" />

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Notifications"
          className="glass relative grid h-11 w-11 place-items-center rounded-full text-ink transition hover:text-health-deep"
        >
          <Bell size={18} strokeWidth={1.8} />
          {alertCount > 0 && (
            <span className="absolute right-2.5 top-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-spectrum-red px-1 text-[9px] font-bold text-white ring-2 ring-white">
              {alertCount}
            </span>
          )}
        </button>

        <div className="glass hidden items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 sm:flex">
          <Avatar name="Dedi Suheri" size={36} />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink">Dedi Suheri</div>
            <div className="text-[11px] text-sage">agronomist@angawatch.io</div>
          </div>
        </div>
      </div>
    </header>
  )
}
