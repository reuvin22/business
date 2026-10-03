/**
 * Where to go after signing in: the page that sent you to the sign-in page (?next=/business/...), e.g. a link from
 * the phone scanner. Only a path inside SIRIS is accepted, never another website.
 */
export function nextPath(search: string, fallback = '/dashboard/business'): string {
  const next = new URLSearchParams(search).get('next') ?? ''
  return next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') ? next : fallback
}

/** The sign-in page, coming back to `path` afterwards. */
export const loginPath = (path: string) => `/login?next=${encodeURIComponent(path)}`
