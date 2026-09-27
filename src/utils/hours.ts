import type { DayHours } from '../api/types'

/** "Mon–Fri 08:00–17:00" style summary for tables. */
export function hoursSummary(hours: DayHours[]) {
  const open = hours.filter((h) => !h.isClosed)
  if (open.length === 0) return 'Not set'
  return open.map((h) => `${h.day.slice(0, 3).toLowerCase()} ${h.openingTime}–${h.closingTime}`).join(', ')
}
