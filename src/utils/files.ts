// Where SIRIS's files live (VITE_FILES_URL: the public bucket's address, comma-separate earlier ones too),
// plus R2's signed links for private files. Anything else is not shown inside the app: a link to another
// website could be a fake page (e.g. a fake sign-in) made to look like part of SIRIS.
const FILE_ORIGINS = (import.meta.env.VITE_FILES_URL ?? '')
  .split(',')
  .map((url: string) => url.trim())
  .filter(Boolean)
  .map((url: string) => {
    try {
      return new URL(url).origin
    } catch {
      return ''
    }
  })
  .filter(Boolean)

/** Is this a file SIRIS stores (so it is safe to show inside the app)? */
export function isOwnFile(url: string): boolean {
  try {
    const { origin, hostname, protocol } = new URL(url)
    if (protocol !== 'https:' && !(protocol === 'http:' && hostname === 'localhost')) return false
    if (hostname.endsWith('.r2.cloudflarestorage.com')) return true // a signed link to a private file
    return FILE_ORIGINS.length === 0 || FILE_ORIGINS.includes(origin) // not set (local development): any link
  } catch {
    return false
  }
}
