import { get, upload } from './client'
import type { MediaType } from './types'

/**
 * Where a file belongs: a product photo/video, the business's own logo/cover, a photo sent in a chat, the return
 * policy PDF, or (private, see below) a permit / ID / certificate ('document') or a proof of payment ('proof').
 */
export type ImageKind = 'product' | 'business' | 'chat' | 'policy' | 'document' | 'proof'

/** The largest file the server takes (each image or video). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
export const MAX_UPLOAD_LABEL = '25 MB'

export const IMAGE_TYPES = 'image/jpeg,image/png,image/webp,image/gif'
export const VIDEO_TYPES = 'video/mp4,video/webm,video/quicktime'

type Uploaded = { url: string; mediaType: MediaType }

function send(businessId: string, file: Blob, fileName: string, kind: ImageKind) {
  if (file.size > MAX_UPLOAD_BYTES) return Promise.reject(new Error(`The file is too big (${MAX_UPLOAD_LABEL} at most)`))
  return upload<Uploaded>(`/businesses/${businessId}/images?kind=${kind}`, file, fileName)
}

/** Uploads an image for this business and returns its public URL. */
export const uploadImage = (businessId: string, file: Blob, fileName: string, kind: ImageKind = 'product') =>
  send(businessId, file, fileName, kind).then((result) => result.url)

/** Uploads a product photo or video. Returns its public URL and whether it is an image or a video. */
export const uploadProductMedia = (businessId: string, file: Blob, fileName: string) => send(businessId, file, fileName, 'product')

export const PDF_TYPES = 'application/pdf'

/** Uploads a PDF of the business (e.g. its full return policy) and returns its public URL. */
export const uploadPolicyPdf = (businessId: string, file: Blob, fileName: string) =>
  send(businessId, file, fileName, 'policy').then((result) => result.url)

// ---- Private files ----------------------------------------------------------------------------
// Permits, IDs, certificates, and proofs of payment are stored privately. They are saved as "private:<key>"
// and have no public link: the API gives one that works for a few minutes, to those allowed to see the file.

export const PRIVATE_FILE_TYPES = `${IMAGE_TYPES},${PDF_TYPES}`

export const isPrivateFile = (value: string) => value.startsWith('private:')

/** What a "View" button for a private file says (its stored name is random, so only the kind is shown) */
export const privateFileName = (value: string) => (value.toLowerCase().endsWith('.pdf') ? 'View file (PDF)' : 'View file (image)')

/** Uploads a private file and returns its reference ("private:..."), to save on the document. */
export const uploadPrivateFile = (businessId: string, file: Blob, fileName: string, kind: 'document' | 'proof' = 'document') =>
  send(businessId, file, fileName, kind).then((result) => result.url)

/** A link to one of the business's private files, for a few minutes. Ask again each time it is opened. */
export const openPrivateFile = (businessId: string, ref: string) =>
  get<{ url: string }>(`/businesses/${businessId}/files/open?ref=${encodeURIComponent(ref)}`, { fresh: true }).then((r) => r.url)

/** Platform admins: a link to any business's private file (e.g. a permit attached to a verification). */
export const adminOpenPrivateFile = (ref: string) =>
  get<{ url: string }>(`/admin/files/open?ref=${encodeURIComponent(ref)}`, { fresh: true }).then((r) => r.url)

