import { get } from './client'

/** A place in a picker: code loads the next level, name is what gets saved. */
export type Place = { code: string; name: string }

// Place names almost never change, so each list is kept in this browser for a week (and on the
// server for a month): after the first time, the pickers fill in instantly.
const KEEP_MS = 7 * 24 * 60 * 60 * 1000
const STORAGE_PREFIX = 'geo:v1:'
const loaded = new Map<string, Promise<Place[]>>()

function list(path: string): Promise<Place[]> {
  const already = loaded.get(path)
  if (already) return already

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_PREFIX + path) ?? 'null') as { time: number; places: Place[] } | null
    if (saved && Date.now() - saved.time < KEEP_MS) {
      const places = Promise.resolve(saved.places)
      loaded.set(path, places)
      return places
    }
  } catch {
    // No storage (private window, blocked) or an unreadable entry: ask the API
  }

  const places = get<Place[]>(`/geo${path}`, { fresh: true }).then((result) => {
    try {
      localStorage.setItem(STORAGE_PREFIX + path, JSON.stringify({ time: Date.now(), places: result }))
    } catch {
      // Storage full or blocked: it is still kept for this visit
    }
    return result
  })
  places.catch(() => loaded.delete(path)) // try again next time
  loaded.set(path, places)
  return places
}

const q = (params: Record<string, string>) => `?${new URLSearchParams(params)}`

export const listCountries = () => list('/countries')
/** Philippines: the 17 regions. Elsewhere: states / regions / prefectures. */
export const listRegions = (country: string) => list(`/${country}/regions`)
/** Philippines only. Empty for Metro Manila (NCR), which has no provinces. */
export const listProvinces = (country: string, region: string) => list(`/${country}/provinces${q({ region })}`)
export const listCities = (country: string, region: string, province = '') =>
  list(`/${country}/cities${q({ region, province })}`)
/** Philippines only. */
export const listBarangays = (country: string, city: string) => list(`/${country}/barangays${q({ city })}`)
