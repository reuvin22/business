// Small helpers for showing numbers and dates.

export function formatMoney(value: number | null | undefined, currency?: string, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  const opts: Intl.NumberFormatOptions = { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
  try {
    return new Intl.NumberFormat(undefined, currency ? { ...opts, style: 'currency', currency } : opts).format(value)
  } catch {
    return value.toFixed(decimals)
  }
}

export const formatNumber = (value: number | null | undefined) =>
  value === null || value === undefined ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 2 })

/** "2026-09-27" -> local date text. */
export const formatDate = (date: string | null | undefined) =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString() : '—'

/** Milliseconds -> local date and time text. */
export const formatDateTime = (ms: number | null | undefined) =>
  ms ? new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'

/** Today's local date as "YYYY-MM-DD". */
export function todayText(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export const initials = (name: string) => (name.trim().charAt(0) || '?').toUpperCase()
