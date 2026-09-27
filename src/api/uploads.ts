import { upload } from './client'

/** Uploads an image for this business and returns its public URL. */
export const uploadImage = (businessId: string, file: Blob, fileName: string) =>
  upload<{ url: string }>(`/businesses/${businessId}/images`, file, fileName).then((result) => result.url)
