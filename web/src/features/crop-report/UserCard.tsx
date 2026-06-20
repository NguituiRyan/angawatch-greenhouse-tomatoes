import { Sprout, Warehouse } from 'lucide-react'
import { Avatar } from '@/components/ui/Avatar'
import type { AgronomistCard } from '@/api/types'

/** Agronomist / farmer mini-card with two stats (Plants / Greenhouses). */
export function UserCard({ person }: { person: AgronomistCard }) {
  return (
    <div className="glass-strong flex items-center justify-between gap-3 rounded-inner p-3">
      <div className="flex items-center gap-3">
        <Avatar name={person.name} size={42} />
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink">{person.name}</div>
          <div className="text-[11px] text-sage">{person.role}</div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Stat icon={<Sprout size={14} />} label="Plants" value={person.plants} />
        <Stat icon={<Warehouse size={14} />} label="Houses" value={person.greenhouses} />
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="text-right leading-tight">
      <div className="flex items-center justify-end gap-1 text-[11px] text-sage">
        {icon}
        {label}
      </div>
      <div className="text-sm font-bold text-ink">{value}</div>
    </div>
  )
}
