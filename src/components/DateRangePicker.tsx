import { useEffect, useRef, useState } from 'react'
import { cx } from '../styles'

// A date range filter: a button that opens a calendar. Click the first day, then the last; the two
// ends are highlighted and the days between are shaded. Dates are the local "YYYY-MM-DD".

export type DateRange = { from: string; to: string } // both "" = all dates

type Props = {
  value: DateRange
  onChange: (range: DateRange) => void
  /** Latest day that can be picked (e.g. today for history) */
  max?: string
  /** Offer "All dates" (an empty range) */
  allowAll?: boolean
  label?: string
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

const pad = (n: number) => String(n).padStart(2, '0')
/** A Date -> "YYYY-MM-DD" in this computer's time zone */
const dayText = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const addDays = (day: string, days: number) => {
  const d = parse(day)
  d.setDate(d.getDate() + days)
  return dayText(d)
}
const short = (day: string, withYear: boolean) =>
  parse(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}) })

/** The words on the button: "Today", "Oct 1 – Oct 15, 2026", "All dates". */
function rangeLabel({ from, to }: DateRange, today = dayText(new Date())): string {
  if (!from && !to) return 'All dates'
  if (from === to) return from === today ? 'Today' : short(from, true)
  const sameYear = from.slice(0, 4) === to.slice(0, 4)
  return `${short(from, !sameYear)} – ${short(to, true)}`
}

function presets(today: string, allowAll: boolean): { label: string; range: DateRange }[] {
  const now = parse(today)
  const monthStart = dayText(new Date(now.getFullYear(), now.getMonth(), 1))
  const lastMonthStart = dayText(new Date(now.getFullYear(), now.getMonth() - 1, 1))
  const lastMonthEnd = dayText(new Date(now.getFullYear(), now.getMonth(), 0))
  return [
    { label: 'Today', range: { from: today, to: today } },
    { label: 'Yesterday', range: { from: addDays(today, -1), to: addDays(today, -1) } },
    { label: 'Last 7 days', range: { from: addDays(today, -6), to: today } },
    { label: 'Last 30 days', range: { from: addDays(today, -29), to: today } },
    { label: 'This month', range: { from: monthStart, to: today } },
    { label: 'Last month', range: { from: lastMonthStart, to: lastMonthEnd } },
    ...(allowAll ? [{ label: 'All dates', range: { from: '', to: '' } }] : []),
  ]
}

export default function DateRangePicker({ value, onChange, max, allowAll = false, label = 'Dates' }: Props) {
  const today = dayText(new Date())
  const [open, setOpen] = useState(false)
  // While picking: the first day clicked (waiting for the last one)
  const [start, setStart] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [month, setMonth] = useState(() => (value.to || value.from || today).slice(0, 7)) // "YYYY-MM"
  const box = useRef<HTMLDivElement>(null)

  // Close on a click outside or Escape (a range half-picked is dropped)
  useEffect(() => {
    if (!open) return
    const outside = (e: MouseEvent) => !box.current?.contains(e.target as Node) && close()
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('keydown', escape)
    }
  })

  function close() {
    setOpen(false)
    setStart(null)
    setHovered(null)
  }

  function choose(range: DateRange) {
    onChange(range)
    close()
  }

  function clickDay(day: string) {
    if (!start) {
      setStart(day) // the first end; the second click finishes the range
      return
    }
    choose(day < start ? { from: day, to: start } : { from: start, to: day })
  }

  // What to highlight: the range being picked (start to the hovered day), or the chosen one
  const picking = start !== null
  const lo = picking ? (hovered && hovered < start ? hovered : start) : value.from
  const hi = picking ? (hovered && hovered > start ? hovered : start) : value.to

  const [year, monthIndex] = month.split('-').map(Number)
  const first = new Date(year, monthIndex - 1, 1)
  const leading = (first.getDay() + 6) % 7 // Monday first
  const daysInMonth = new Date(year, monthIndex, 0).getDate()
  const cells: (string | null)[] = [
    ...Array<null>(leading).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${pad(i + 1)}`),
  ]
  const shiftMonth = (by: number) => setMonth(dayText(new Date(year, monthIndex - 1 + by, 1)).slice(0, 7))
  const nextDisabled = !!max && month >= max.slice(0, 7) // nothing to pick after the last allowed month

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${rangeLabel(value, today)}`}
        onClick={() => (open ? close() : setOpen(true))}
        className={cx(
          'flex cursor-pointer items-center gap-2 rounded-lg border bg-surface px-3 py-2.5 text-[0.92rem] font-semibold text-heading',
          open ? 'border-accent' : 'border-line hover:border-muted',
        )}
      >
        <svg viewBox="0 0 24 24" className="size-4 text-muted" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        {rangeLabel(value, today)}
        <svg viewBox="0 0 24 24" className="size-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={label}
          className="absolute top-full right-0 z-40 mt-2 flex w-max max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-surface shadow-2xl max-sm:fixed max-sm:inset-x-4 max-sm:top-24 max-sm:w-auto max-sm:flex-col"
        >
          <div className="flex flex-col gap-0.5 border-r border-line p-2 max-sm:flex-row max-sm:flex-wrap max-sm:border-r-0 max-sm:border-b">
            {presets(today, allowAll).map((p) => {
              const active = p.range.from === value.from && p.range.to === value.to
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => choose(p.range)}
                  className={cx(
                    'cursor-pointer rounded-md border-0 px-3 py-1.5 text-left text-[0.85rem] font-semibold whitespace-nowrap',
                    active ? 'bg-info-soft text-accent' : 'bg-transparent text-body hover:bg-chip hover:text-heading',
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-2 p-3" onMouseLeave={() => setHovered(null)}>
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => shiftMonth(-1)} className={navButton} aria-label="Previous month">
                ‹
              </button>
              <span className="text-[0.92rem] font-bold text-heading">
                {first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <button type="button" onClick={() => shiftMonth(1)} className={navButton} aria-label="Next month" disabled={nextDisabled}>
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 text-center">
              {WEEKDAYS.map((d) => (
                <span key={d} className="py-1 text-[0.72rem] font-bold text-muted uppercase">
                  {d}
                </span>
              ))}
              {cells.map((day, i) => {
                if (!day) return <span key={`blank-${i}`} />
                const disabled = !!max && day > max
                const isStart = !!lo && day === lo
                const isEnd = !!hi && day === hi
                const inRange = !!lo && !!hi && day > lo && day < hi
                const isEndpoint = isStart || isEnd
                return (
                  <div
                    key={day}
                    className={cx(
                      'py-0.5',
                      // The band between the two ends (half on the start and end days, so it joins them)
                      inRange && 'bg-info-soft',
                      isStart && hi && hi !== lo && 'bg-gradient-to-r from-transparent from-50% to-info-soft to-50%',
                      isEnd && lo && hi !== lo && 'bg-gradient-to-r from-info-soft from-50% to-transparent to-50%',
                    )}
                  >
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => clickDay(day)}
                      onMouseEnter={() => picking && setHovered(day)}
                      aria-pressed={isEndpoint}
                      aria-label={parse(day).toLocaleDateString(undefined, { dateStyle: 'full' })}
                      className={cx(
                        'mx-auto grid size-9 cursor-pointer place-items-center rounded-full border-0 text-[0.86rem] tabular-nums disabled:cursor-not-allowed disabled:opacity-35',
                        isEndpoint
                          ? 'bg-accent font-bold text-white'
                          : cx('bg-transparent text-heading hover:enabled:bg-chip', inRange && 'font-semibold text-accent'),
                        day === today && !isEndpoint && 'ring-1 ring-accent',
                      )}
                    >
                      {Number(day.slice(8))}
                    </button>
                  </div>
                )
              })}
            </div>

            <p className="m-0 text-center text-[0.8rem] text-muted">
              {picking ? 'Now click the last day.' : 'Click the first day, then the last.'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

const navButton =
  'grid size-8 cursor-pointer place-items-center rounded-md border-0 bg-transparent text-[1.3rem] leading-none text-heading hover:enabled:bg-chip disabled:cursor-not-allowed disabled:opacity-35'
