import { useState } from 'react'
import type { ProductImage } from '../api/types'
import { cx } from '../styles'
import { isVideo } from '../utils/media'
import { ProductThumb } from './ui'

/** A large photo or video with small thumbnails to switch between them. Shows a placeholder when there are none. */
export default function ProductGallery({ images }: { images: ProductImage[] }) {
  const primaryIndex = Math.max(
    images.findIndex((image) => image.isPrimary),
    0,
  )
  const [selected, setSelected] = useState(primaryIndex)
  const current = images[selected] ?? images[primaryIndex]

  return (
    <div className="flex w-full max-w-80 flex-col gap-2">
      {current && isVideo(current) ? (
        <video
          key={current.imageUrl}
          src={current.imageUrl}
          controls
          playsInline
          preload="metadata"
          className="aspect-square w-full max-w-80 rounded-xl bg-black object-contain"
        />
      ) : (
        <ProductThumb images={current ? [current] : []} size="lg" />
      )}
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, i) => (
            <button
              key={image.imageUrl + i}
              type="button"
              onClick={() => setSelected(i)}
              className={cx(
                'relative cursor-pointer overflow-hidden rounded-md border-2 p-0',
                i === selected ? 'border-accent' : 'border-transparent',
              )}
              aria-label={`Show ${isVideo(image) ? 'video' : 'image'} ${i + 1}`}
            >
              {isVideo(image) ? (
                <>
                  <video src={image.imageUrl} muted playsInline preload="metadata" className="block size-14 bg-black object-cover" />
                  <span className="absolute inset-0 grid place-items-center text-white" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </>
              ) : (
                <img src={image.imageUrl} alt="" loading="lazy" className="block size-14 object-cover" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
