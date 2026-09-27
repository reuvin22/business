import type { DayHours } from '../api/types'
import { DAYS } from '../constants/options'
import { ui } from '../styles'
import { FormSection } from './FieldForm'

type Props = { value: DayHours[]; onChange: (hours: DayHours[]) => void }

const closedDay = (day: string): DayHours => ({ day, openingTime: '', closingTime: '', isClosed: true, breakPeriods: [] })

/** Weekly opening hours: one row per day, with an optional break (e.g. lunch). */
export default function HoursEditor({ value, onChange }: Props) {
  const hoursFor = (day: string) => value.find((h) => h.day === day) ?? closedDay(day)

  function update(day: string, changes: Partial<DayHours>) {
    const updated = { ...hoursFor(day), ...changes }
    onChange(DAYS.map((d) => (d.value === day ? updated : hoursFor(d.value))))
  }

  function setBreak(day: string, part: 'start' | 'end', time: string) {
    const current = hoursFor(day).breakPeriods[0] ?? { start: '', end: '' }
    const next = { ...current, [part]: time }
    update(day, { breakPeriods: next.start || next.end ? [next] : [] })
  }

  /** Quick fill: Monday-Friday 8:00-17:00, weekend closed. */
  function fillWeekdays() {
    onChange(
      DAYS.map((d) =>
        ['SATURDAY', 'SUNDAY'].includes(d.value)
          ? closedDay(d.value)
          : { day: d.value, openingTime: '08:00', closingTime: '17:00', isClosed: false, breakPeriods: [] },
      ),
    )
  }

  return (
    <FormSection title="Opening hours">
      <div className="mb-2.5 flex gap-4">
        <button type="button" className={ui.link} onClick={fillWeekdays}>
          Fill Mon–Fri 8:00–17:00
        </button>
        {value.length > 0 && (
          <button type="button" className={ui.link} onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {DAYS.map(({ value: day, label }) => {
          const hours = hoursFor(day)
          const breakTime = hours.breakPeriods[0] ?? { start: '', end: '' }
          return (
            <div key={day} className="grid grid-cols-[100px_80px_1fr] items-center gap-2.5 max-sm:grid-cols-1">
              <span className="text-[0.88rem] font-semibold text-heading">{label}</span>
              <label className={ui.checkboxLabel}>
                <input
                  type="checkbox"
                  className={ui.checkbox}
                  checked={!hours.isClosed}
                  onChange={(e) =>
                    update(day, e.target.checked ? { isClosed: false, openingTime: '08:00', closingTime: '17:00' } : closedDay(day))
                  }
                />
                <span>Open</span>
              </label>
              {hours.isClosed ? (
                <span className="text-muted">Closed</span>
              ) : (
                <span className="flex flex-wrap items-center gap-1.5">
                  <input type="time" className={ui.inputSmall} value={hours.openingTime} onChange={(e) => update(day, { openingTime: e.target.value })} aria-label={`${label} opens`} />
                  –
                  <input type="time" className={ui.inputSmall} value={hours.closingTime} onChange={(e) => update(day, { closingTime: e.target.value })} aria-label={`${label} closes`} />
                  <span className="text-muted">break</span>
                  <input type="time" className={ui.inputSmall} value={breakTime.start} onChange={(e) => setBreak(day, 'start', e.target.value)} aria-label={`${label} break starts`} />
                  –
                  <input type="time" className={ui.inputSmall} value={breakTime.end} onChange={(e) => setBreak(day, 'end', e.target.value)} aria-label={`${label} break ends`} />
                </span>
              )}
            </div>
          )
        })}
      </div>
    </FormSection>
  )
}
