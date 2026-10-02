import { get, query } from './client'
import type { Activity, ActivityCategory } from './types'

/** The business's activity history, newest first. start / end: milliseconds (local midnight of the chosen days). */
export const listActivity = (businessId: string, filters: { category?: ActivityCategory | ''; start?: number; end?: number }) =>
  get<Activity[]>(
    `/businesses/${businessId}/activity${query({
      category: filters.category || undefined,
      start: filters.start?.toString(),
      end: filters.end?.toString(),
    })}`,
    { fresh: true },
  )
