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

export const get = <T>(path: string) => api<T>(path)
export const post = <T>(path: string, body?: unknown) => api<T>(path, 'POST', body ?? {})
export const put = <T>(path: string, body: unknown) => api<T>(path, 'PUT', body)
export const del = (path: string) => api<void>(path, 'DELETE')

/** Builds "?a=1&b=2" from an object, skipping empty values. */
export function query(params: Record<string, string | boolean | undefined | null>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '' && value !== false) search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}
