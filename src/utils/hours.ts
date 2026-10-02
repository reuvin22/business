import type { DayHours } from '../api/types'

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']
const SHORT = (day: string) => day.charAt(0) + day.slice(1, 3).toLowerCase() // MONDAY -> Mon

/** "Mon–Fri 08:00–17:00" style summary for tables. */
export function hoursSummary(hours: DayHours[]) {
  const groups = groupHours(hours).filter((g) => !g.closed)
  if (groups.length === 0) return 'Not set'
  return groups.map((g) => `${g.days} ${g.time}`).join(', ')
}

/** "08:00" -> "8:00 AM" */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h)) return time
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m || 0).padStart(2, '0')} ${suffix}`
}

function timeText(day: DayHours | undefined): string {
  if (!day || day.isClosed) return 'Closed'
  const breaks = day.breakPeriods?.length
    ? ` (break ${day.breakPeriods.map((b) => `${formatTime(b.start)}–${formatTime(b.end)}`).join(', ')})`
    : ''
  return `${formatTime(day.openingTime)} – ${formatTime(day.closingTime)}${breaks}`
}

export type HoursGroup = { days: string; time: string; closed: boolean; today: boolean }

/** Days next to each other with the same hours become one row: "Mon–Fri · 8:00 AM – 5:00 PM". */
export function groupHours(hours: DayHours[], now = new Date()): HoursGroup[] {
  const byDay = new Map(hours.map((h) => [h.day, h]))
  const today = DAYS[(now.getDay() + 6) % 7] // getDay(): 0 = Sunday
  const groups: { first: string; last: string; time: string; closed: boolean; today: boolean }[] = []
  for (const day of DAYS) {
    const time = timeText(byDay.get(day))
    const previous = groups[groups.length - 1]
    if (previous && previous.time === time) {
      previous.last = day
      previous.today ||= day === today
    } else {
      groups.push({ first: day, last: day, time, closed: time === 'Closed', today: day === today })
    }
  }
  return groups.map((g) => ({
    days: g.first === g.last ? SHORT(g.first) : `${SHORT(g.first)}–${SHORT(g.last)}`,
    time: g.time,
    closed: g.closed,
    today: g.today,
  }))
}

const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** Open right now (this computer's time), counting breaks. null when no hours are set. */
export function isOpenNow(hours: DayHours[], now = new Date()): boolean | null {
  if (!hours.some((h) => !h.isClosed)) return null
  const day = hours.find((h) => h.day === DAYS[(now.getDay() + 6) % 7])
  if (!day || day.isClosed) return false
  const current = now.getHours() * 60 + now.getMinutes()
  const open = minutes(day.openingTime)
  const close = minutes(day.closingTime)
  const inHours = close > open ? current >= open && current < close : current >= open || current < close // past midnight
  const onBreak = (day.breakPeriods ?? []).some((b) => current >= minutes(b.start) && current < minutes(b.end))
  return inHours && !onBreak
}
