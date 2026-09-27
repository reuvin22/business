// Every call to the backend goes through `api()`. It adds the Firebase login token
// and turns error responses into an ApiError with a readable message.
import { auth } from '../firebase'

const API_URL = import.meta.env.VITE_API_URL || 'https://business-be-p3bx.onrender.com/api/v1'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type ValidationIssue = { loc?: (string | number)[]; msg?: string }

/** FastAPI sends { detail: "text" } or, for invalid input, { detail: [{ loc, msg }, ...] }. */
function readErrorMessage(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return (detail as ValidationIssue[])
      .map((issue) => {
        const field = issue.loc?.filter((part) => part !== 'body').join(' › ')
        const message = (issue.msg ?? '').replace(/^Value error, /, '')
        return field ? `${field}: ${message}` : message
      })
      .join('\n')
  }
  return fallback
}

async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken()
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, readErrorMessage(data, response.statusText))
  return data as T
}

// ---- Short in-browser cache for GET requests ----------------------------------------------
// Going back to a page you just saw shows it instantly, and two components asking for the
// same thing at once share one request. Any change (POST/PUT/DELETE) forgets everything,
// so you always see your own changes straight away.
const BROWSER_CACHE_MS = 30_000
const recent = new Map<string, { time: number; promise: Promise<unknown> }>()

/** Forget all remembered responses (after a change, or when the user logs out). */
export function clearApiCache() {
  recent.clear()
}

/** GET a path. Pass { fresh: true } to skip the browser cache (e.g. for chat messages). */
export function get<T>(path: string, options: { fresh?: boolean } = {}): Promise<T> {
  const remembered = recent.get(path)
  if (!options.fresh && remembered && Date.now() - remembered.time < BROWSER_CACHE_MS) {
    return remembered.promise as Promise<T>
  }
  const promise = api<T>(path)
  recent.set(path, { time: Date.now(), promise })
  promise.catch(() => recent.delete(path)) // never remember a failure
  return promise
}

/** Runs a change, then forgets remembered responses (they may be outdated now). */
function change<T>(request: Promise<T>): Promise<T> {
  clearApiCache()
  return request.finally(clearApiCache)
}

export const post = <T>(path: string, body?: unknown) => change(api<T>(path, 'POST', body ?? {}))
export const put = <T>(path: string, body: unknown) => change(api<T>(path, 'PUT', body))
export const del = (path: string) => change(api<void>(path, 'DELETE'))

/** Sends a file as form data (field name "file"), e.g. an image upload. */
export async function upload<T>(path: string, file: Blob, fileName: string): Promise<T> {
  const token = await auth.currentUser?.getIdToken()
  const form = new FormData()
  form.append('file', file, fileName)
  // No Content-Type header: the browser sets it (with the form boundary) for FormData
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, readErrorMessage(data, response.statusText))
  return data as T
}

/** Builds "?a=1&b=2" from an object, skipping empty values. */
export function query(params: Record<string, string | boolean | undefined | null>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== false) search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}
