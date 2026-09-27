import type { DayHours } from '../api/types'
import { DAYS } from '../constants/options'

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
    <fieldset className="form-section">
      <legend>Opening hours</legend>
      <div className="hours-toolbar">
        <button type="button" className="link" onClick={fillWeekdays}>
          Fill Mon–Fri 8:00–17:00
        </button>
        {value.length > 0 && (
          <button type="button" className="link" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
      <div className="hours-table">
        {DAYS.map(({ value: day, label }) => {
          const hours = hoursFor(day)
          const breakTime = hours.breakPeriods[0] ?? { start: '', end: '' }
          return (
            <div key={day} className="hours-row">
              <span className="hours-day">{label}</span>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={!hours.isClosed}
                  onChange={(e) =>
                    update(day, e.target.checked ? { isClosed: false, openingTime: '08:00', closingTime: '17:00' } : closedDay(day))
                  }
                />
                <span>Open</span>
              </label>
              {hours.isClosed ? (
                <span className="muted">Closed</span>
              ) : (
                <span className="hours-times">
                  <input type="time" value={hours.openingTime} onChange={(e) => update(day, { openingTime: e.target.value })} aria-label={`${label} opens`} />
                  –
                  <input type="time" value={hours.closingTime} onChange={(e) => update(day, { closingTime: e.target.value })} aria-label={`${label} closes`} />
                  <span className="muted">break</span>
                  <input type="time" value={breakTime.start} onChange={(e) => setBreak(day, 'start', e.target.value)} aria-label={`${label} break starts`} />
                  –
                  <input type="time" value={breakTime.end} onChange={(e) => setBreak(day, 'end', e.target.value)} aria-label={`${label} break ends`} />
                </span>
              )}
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}
