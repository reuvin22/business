import { upload } from './client'
import type { MediaType } from './types'

/** Where a file belongs: a product photo/video, the business's own logo/cover, or a photo sent in a chat. */
export type ImageKind = 'product' | 'business' | 'chat'

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
