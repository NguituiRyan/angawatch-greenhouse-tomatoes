import { MapPin, CalendarDays } from 'lucide-react'

interface PageHeaderProps {
  title: string
  location: string
  date: string
}

export function PageHeader({ title, location, date }: PageHeaderProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-sage">
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={15} strokeWidth={1.8} />
          {location}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays size={15} strokeWidth={1.8} />
          {date}
        </span>
      </div>
    </div>
  )
}
