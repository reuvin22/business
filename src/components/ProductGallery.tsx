import { useState } from 'react'
import type { ProductImage } from '../api/types'
import { cx } from '../styles'
import { ProductThumb } from './ui'

/** A large image with small thumbnails to switch between them. Shows a placeholder when there are none. */
export default function ProductGallery({ images }: { images: ProductImage[] }) {
  const primaryIndex = Math.max(
    images.findIndex((image) => image.isPrimary),
    0,
  )
  const [selected, setSelected] = useState(primaryIndex)
  const current = images[selected] ?? images[primaryIndex]

  return (
    <div className="flex w-full max-w-80 flex-col gap-2">
      <ProductThumb images={current ? [current] : []} size="lg" />
      {images.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {images.map((image, i) => (
            <button
              key={image.imageUrl + i}
              type="button"
              onClick={() => setSelected(i)}
              className={cx(
                'cursor-pointer overflow-hidden rounded-md border-2 p-0',
                i === selected ? 'border-accent' : 'border-transparent',
              )}
              aria-label={`Show image ${i + 1}`}
            >
              <img src={image.imageUrl} alt="" loading="lazy" className="block size-14 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
