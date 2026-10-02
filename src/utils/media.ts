/** True for a product video (products saved before videos existed have no mediaType: they are images). */
export const isVideo = (media: { mediaType?: string }) => media.mediaType === 'VIDEO'
