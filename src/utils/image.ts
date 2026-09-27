// Shrinks photos in the browser before uploading: a phone photo of 4 MB becomes ~150 KB,
// so uploads are quick and pages load fast. GIFs are left alone (they may be animated).

const MAX_SIDE = 1600 // pixels
const QUALITY = 0.85

export async function shrinkImage(file: File): Promise<{ blob: Blob; name: string }> {
  if (file.type === 'image/gif') return { blob: file, name: file.name }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY))
  // If the browser can't make WEBP, or shrinking made it bigger, upload the original
  if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return { blob: file, name: file.name }
  return { blob, name: file.name.replace(/\.[^.]+$/, '') + '.webp' }
}
