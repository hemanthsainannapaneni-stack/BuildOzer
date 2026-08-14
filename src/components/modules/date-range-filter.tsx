'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type DateRangeValue = {
  preset: string
  dateFrom: string
  dateTo: string
  label: string
}

const toDateStr = (d: Date) => d.toISOString().split('T')[0]

function getPresetRange(preset: string): { from: Date; to: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (preset) {
    case 'today':    return { from: today, to: today }
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1)
      return { from: y, to: y }
    }
    case 'thisWeek': {
      const day = today.getDay()
      const mon = new Date(today); mon.setDate(today.getDate() - ((day + 6) % 7))
      return { from: mon, to: today }
    }
    case 'last7': {
      const from = new Date(today); from.setDate(today.getDate() - 6)
      return { from, to: today }
    }
    case 'last30': {
      const from = new Date(today); from.setDate(today.getDate() - 29)
      return { from, to: today }
    }
    case 'thisMonth': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1)
      return { from, to: today }
    }
    case 'lastMonth': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const to = new Date(today.getFullYear(), today.getMonth(), 0)
      return { from, to }
    }
    default: return { from: today, to: today }
  }
}

const PRESETS = [
  { id: 'today',     label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'thisWeek',  label: 'This Week' },
  { id: 'last7',     label: 'Last 7 Days' },
  { id: 'last30',    label: 'Last 30 Days' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'custom',    label: 'Custom Range' },
]

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAY_LABELS  = ['Mo','Tu','We','Th','Fr','Sa','Su']

interface MiniCalProps {
  year: number; month: number
  fromStr: string; toStr: string; hoverStr: string
  selectingFrom: boolean
  onDayClick: (d: Date) => void
  onDayHover: (s: string) => void
  onPrev: () => void; onNext: () => void
}

function MiniCal({ year, month, fromStr, toStr, hoverStr, selectingFrom, onDayClick, onDayHover, onPrev, onNext }: MiniCalProps) {
  const firstDOW = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number|null)[] = Array(firstDOW).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const effectiveTo = !selectingFrom && hoverStr && hoverStr >= fromStr ? hoverStr : toStr

  return (
    <div className="select-none w-[140px]">
      <div className="flex items-center justify-between mb-2 px-0.5">
        <button onClick={onPrev} className="h-5 w-5 flex items-center justify-center rounded hover:bg-teal-50 text-slate-400 hover:text-teal-700 transition-colors">
          <ChevronLeft className="h-3 w-3" />
        </button>
        <span className="text-[11px] font-bold text-slate-700">{MONTH_NAMES[month]} {year}</span>
        <button onClick={onNext} className="h-5 w-5 flex items-center justify-center rounded hover:bg-teal-50 text-slate-400 hover:text-teal-700 transition-colors">
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map(d => <div key={d} className="text-center text-[9px] font-semibold text-slate-400">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="h-5" />
          const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const isFrom = ds === fromStr
          const isTo   = ds === effectiveTo
          const inRange = fromStr && effectiveTo && ds > fromStr && ds < effectiveTo
          const isToday = ds === toDateStr(new Date())
          return (
            <div
              key={day}
              onClick={() => onDayClick(new Date(year, month, day))}
              onMouseEnter={() => onDayHover(ds)}
              className={cn(
                'h-5 w-5 mx-auto flex items-center justify-center text-[10px] font-medium cursor-pointer transition-all',
                isFrom && isTo  && 'bg-teal-600 text-white rounded',
                isFrom && !isTo && 'bg-teal-600 text-white rounded-l rounded-r-none',
                isTo && !isFrom && 'bg-teal-600 text-white rounded-r rounded-l-none',
                inRange && 'bg-teal-100 text-teal-800 rounded-none',
                !isFrom && !isTo && !inRange && 'hover:bg-teal-50 text-slate-700 rounded',
                isToday && !isFrom && !isTo && 'text-teal-700 font-bold underline underline-offset-2',
              )}
            >{day}</div>
          )
        })}
      </div>
    </div>
  )
}

interface DateRangeFilterProps {
  value: DateRangeValue
  onChange: (v: DateRangeValue) => void
  className?: string
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false)
  const [activePreset, setActivePreset] = useState(value.preset)
  const [showCustom, setShowCustom] = useState(value.preset === 'custom')
  const now = new Date()
  const [calYear,  setCalYear]  = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())
  const [selectingFrom, setSelectingFrom] = useState(true)
  const [customFrom, setCustomFrom] = useState(value.dateFrom)
  const [customTo,   setCustomTo]   = useState(value.dateTo)
  const [hoverStr, setHoverStr] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function applyPreset(preset: string) {
    if (preset === 'custom') { setActivePreset('custom'); setShowCustom(true); return }
    setShowCustom(false)
    const { from, to } = getPresetRange(preset)
    const label = PRESETS.find(p => p.id === preset)!.label
    setActivePreset(preset)
    onChange({ preset, dateFrom: toDateStr(from), dateTo: toDateStr(to), label })
    setOpen(false)
  }

  function handleDayClick(d: Date) {
    const ds = toDateStr(d)
    if (selectingFrom) {
      setCustomFrom(ds); setCustomTo(''); setSelectingFrom(false)
    } else {
      if (ds < customFrom) { setCustomTo(customFrom); setCustomFrom(ds) }
      else { setCustomTo(ds) }
      setSelectingFrom(true)
    }
  }

  function applyCustom() {
    const from = customFrom || toDateStr(new Date())
    const to   = customTo && customTo >= from ? customTo : from
    onChange({ preset: 'custom', dateFrom: from, dateTo: to, label: from === to ? from : `${from} → ${to}` })
    setOpen(false)
  }

  const nextMonth = calMonth === 11 ? 0 : calMonth + 1
  const nextYear  = calMonth === 11 ? calYear + 1 : calYear

  function prevCal() { if (calMonth === 0) { setCalYear(y => y-1); setCalMonth(11) } else setCalMonth(m => m-1) }
  function nextCal() { if (calMonth === 11) { setCalYear(y => y+1); setCalMonth(0) } else setCalMonth(m => m+1) }

  return (
    <div ref={ref} className={cn('relative shrink-0', className)}>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center gap-1 h-7.5 px-2 rounded-lg border text-[11px] font-semibold transition-all bg-white/95 shadow-2xs hover:border-teal-400 cursor-pointer',
          open ? 'border-teal-500 ring-2 ring-teal-500/20' : 'border-teal-200/80',
          value.preset !== 'today' ? 'text-teal-700 border-teal-400' : 'text-slate-800',
        )}
      >
        <Calendar className="h-3 w-3 text-teal-600 shrink-0" />
        <span className="max-w-[130px] truncate">{value.label}</span>
        <ChevronDown className={cn('h-3 w-3 text-slate-400 shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 z-[200] bg-white rounded-xl border border-slate-200 shadow-2xl flex overflow-hidden">
          {/* Presets sidebar */}
          <div className="flex flex-col border-r border-slate-100 py-2 w-[130px]">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 px-3 pb-1.5">Quick Select</p>
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                className={cn(
                  'text-left px-3 py-1.5 text-[11px] font-medium transition-colors',
                  activePreset === p.id
                    ? 'bg-teal-50 text-teal-700 font-semibold border-l-2 border-teal-500'
                    : 'text-slate-600 hover:bg-teal-50 hover:text-teal-700 border-l-2 border-transparent',
                )}
              >{p.label}</button>
            ))}
          </div>

          {/* Custom calendar */}
          {showCustom && (
            <div className="p-3 flex flex-col gap-2.5" onMouseLeave={() => setHoverStr('')}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {selectingFrom ? '① Pick start date' : '② Pick end date'}
                </p>
                {customFrom && (
                  <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-md">
                    {customFrom}{customTo && customTo !== customFrom ? ` → ${customTo}` : ''}
                  </span>
                )}
              </div>

              <div className="flex gap-4">
                <MiniCal year={calYear} month={calMonth} fromStr={customFrom} toStr={customTo} hoverStr={hoverStr} selectingFrom={selectingFrom} onDayClick={handleDayClick} onDayHover={setHoverStr} onPrev={prevCal} onNext={nextCal} />
                <MiniCal year={nextYear} month={nextMonth} fromStr={customFrom} toStr={customTo} hoverStr={hoverStr} selectingFrom={selectingFrom} onDayClick={handleDayClick} onDayHover={setHoverStr} onPrev={prevCal} onNext={nextCal} />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button onClick={() => { setCustomFrom(value.dateFrom); setCustomTo(value.dateTo); setOpen(false) }} className="text-[11px] font-medium text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={applyCustom} disabled={!customFrom} className="text-[11px] font-semibold text-white bg-teal-600 hover:bg-teal-700 px-3 py-1 rounded-lg transition-colors disabled:opacity-40">
                  Apply Range
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
