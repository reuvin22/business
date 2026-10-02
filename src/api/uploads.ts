import { upload } from './client'

/** Where an image belongs: a product photo, or the business's own logo/cover. Each has its own folder. */
export type ImageKind = 'product' | 'business'

/** Uploads an image for this business and returns its public URL. */
export const uploadImage = (businessId: string, file: Blob, fileName: string, kind: ImageKind = 'product') =>
  upload<{ url: string }>(`/businesses/${businessId}/images?kind=${kind}`, file, fileName).then((result) => result.url)
