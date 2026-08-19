'use client'

import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { CalendarDays } from 'lucide-react'
import { format, parseISO, subDays, subMonths, startOfMonth, startOfYear, isToday } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Props {
  /** yyyy-MM-dd, or '' for unbounded. */
  from: string
  to: string
  onChange: (from: string, to: string) => void
  className?: string
}

const toKey = (d: Date) => format(d, 'yyyy-MM-dd')
const fromKey = (s: string) => (s ? parseISO(s) : undefined)

interface Preset {
  label: string
  range: () => { from: Date; to: Date }
}

const PRESETS: Preset[] = [
  { label: 'Today', range: () => ({ from: new Date(), to: new Date() }) },
  { label: 'Last 7 days', range: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: 'Last 30 days', range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: 'This month', range: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: 'Last 3 months', range: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
  { label: 'This year', range: () => ({ from: startOfYear(new Date()), to: new Date() }) },
]

/**
 * One calendar for a date range: quick presets down the side, and the calendar
 * itself for picking custom start/end days (click once for the start, again for
 * the end). Replaces a pair of from/to date inputs.
 */
export default function DateRangeFilter({ from, to, onChange, className }: Props) {
  const [open, setOpen] = useState(false)

  const range: DateRange | undefined = from || to
    ? { from: fromKey(from), to: fromKey(to) }
    : undefined

  const label = (() => {
    if (!from && !to) return 'Overall'
    const f = fromKey(from)
    const t = fromKey(to)
    if (f && t) {
      if (from === to) return isToday(f) ? 'Today' : format(f, 'd MMM yyyy')
      const sameYear = f.getFullYear() === t.getFullYear()
      return `${format(f, sameYear ? 'd MMM' : 'd MMM yyyy')} – ${format(t, 'd MMM yyyy')}`
    }
    if (f) return `From ${format(f, 'd MMM yyyy')}`
    if (t) return `Until ${format(t, 'd MMM yyyy')}`
    return 'Overall'
  })()

  // "Overall" is the resting state, so only a real date bound gets the accent.
  const active = !!(from || to)

  const clear = () => onChange('', '')

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            'justify-start font-normal gap-2 min-w-0',
            active && 'border-[#0d9488]/40 text-[#0d9488]',
            className,
          )}
        >
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex flex-col sm:flex-row">
          <div className="flex sm:flex-col gap-1 p-2 border-b sm:border-b-0 sm:border-r overflow-x-auto">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="text-left text-xs whitespace-nowrap rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors"
                onClick={() => {
                  const r = p.range()
                  onChange(toKey(r.from), toKey(r.to))
                }}
              >
                {p.label}
              </button>
            ))}
            {/* Drops the date bound entirely — every record, any date. */}
            <button
              type="button"
              className="text-left text-xs whitespace-nowrap rounded-md px-2.5 py-1.5 hover:bg-muted transition-colors"
              onClick={clear}
            >
              Overall
            </button>
          </div>
          <div>
            <Calendar
              mode="range"
              selected={range}
              defaultMonth={fromKey(from) ?? fromKey(to) ?? new Date()}
              onSelect={(r: DateRange | undefined) =>
                onChange(r?.from ? toKey(r.from) : '', r?.to ? toKey(r.to) : '')
              }
              numberOfMonths={1}
              autoFocus
            />
            <div className="flex items-center justify-between gap-3 border-t px-3 py-2">
              <span className="text-xs text-muted-foreground">
                {active ? label : 'Pick a start and end day'}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
