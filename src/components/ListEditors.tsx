// Editors for small lists inside a form: product photos/videos and name/value pairs.
import { useState } from 'react'
import { IMAGE_TYPES, MAX_UPLOAD_LABEL, uploadProductMedia, VIDEO_TYPES } from '../api/uploads'
import type { MediaType, ProductImage } from '../api/types'
import { cx, ui } from '../styles'
import { shrinkImage } from '../utils/image'
import { FormSection } from './FieldForm'
import { isVideo } from '../utils/media'
import { ErrorBox, Spinner } from './ui'

export type Pair = { name: string; value: string }

const rowClass = 'flex w-full items-center gap-2.5'

/** Rows of name + value, e.g. specifications ("Shelf life" = "12 months") or variant attributes. */
export function PairsEditor({
  title,
  pairs,
  onChange,
  namePlaceholder = 'Name',
  valuePlaceholder = 'Value',
}: {
  title: string
  pairs: Pair[]
  onChange: (pairs: Pair[]) => void
  namePlaceholder?: string
  valuePlaceholder?: string
}) {
  const update = (index: number, changes: Partial<Pair>) =>
    onChange(pairs.map((pair, i) => (i === index ? { ...pair, ...changes } : pair)))

  return (
    <FormSection title={title}>
      <div className="flex flex-col items-start gap-2.5">
        {pairs.map((pair, i) => (
          <div key={i} className={rowClass}>
            <input className={ui.input} value={pair.name} onChange={(e) => update(i, { name: e.target.value })} placeholder={namePlaceholder} />
            <input className={ui.input} value={pair.value} onChange={(e) => update(i, { value: e.target.value })} placeholder={valuePlaceholder} />
            <button type="button" className={ui.linkDanger} onClick={() => onChange(pairs.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className={ui.link} onClick={() => onChange([...pairs, { name: '', value: '' }])}>
          + Add row
        </button>
      </div>
    </FormSection>
  )
}

/** Product photos and videos: upload from your device (or paste an image link). Optional; one image is the primary. */
export function ImagesEditor({
  businessId,
  images,
  onChange,
}: {
  businessId: string
  images: ProductImage[]
  onChange: (images: ProductImage[]) => void
}) {
  const [uploading, setUploading] = useState(0)
  const [error, setError] = useState('')
  const [link, setLink] = useState('')

  // Only an image can be the primary: the first image becomes it when there is none yet
  const add = (imageUrl: string, mediaType: MediaType, list: ProductImage[]) => [
    ...list,
    { imageUrl, mediaType, sortOrder: list.length, isPrimary: mediaType === 'IMAGE' && !list.some((item) => item.isPrimary) },
  ]
  const makePrimary = (index: number) => onChange(images.map((image, i) => ({ ...image, isPrimary: i === index })))
  const remove = (index: number) => {
    const rest = images.filter((_, i) => i !== index)
    // Keep one primary image when the primary one is removed
    const firstImage = rest.findIndex((item) => !isVideo(item))
    if (firstImage >= 0 && !rest.some((item) => item.isPrimary)) rest[firstImage] = { ...rest[firstImage], isPrimary: true }
    onChange(rest)
  }

  async function handleFiles(files: File[]) {
    if (!files.length) return
    setError('')
    setUploading(files.length)
    let list = images
    const errors: string[] = []
    for (const file of files) {
      try {
        // Photos are shrunk in the browser first; videos are sent as they are
        const { blob, name } = file.type.startsWith('video/') ? { blob: file, name: file.name } : await shrinkImage(file)
        const uploaded = await uploadProductMedia(businessId, blob, name)
        list = add(uploaded.url, uploaded.mediaType, list)
        onChange(list)
      } catch (err) {
        errors.push(`${file.name}: ${(err as Error).message}`)
        setError(errors.join('; '))
      } finally {
        setUploading((n) => n - 1)
      }
    }
  }

  return (
    <FormSection
      title="Photos and videos (optional)"
      hint="Upload as many as you like from your device. The primary image is shown first in lists."
    >
      <div className="flex flex-col gap-3">
        {images.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
            {images.map((image, i) => {
              const tileClass = cx(
                'aspect-square w-full rounded-lg border-2 bg-chip object-cover',
                image.isPrimary ? 'border-accent' : 'border-transparent',
              )
              return (
                <figure key={image.imageUrl + i} className="m-0 flex flex-col gap-1.5">
                  {isVideo(image) ? (
                    <video src={image.imageUrl} controls muted playsInline preload="metadata" className={tileClass} />
                  ) : (
                    <img src={image.imageUrl} alt="" className={tileClass} />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    {isVideo(image) ? (
                      <span className={ui.hint}>Video</span>
                    ) : (
                      <label className={ui.checkboxLabel}>
                        <input type="radio" className={ui.checkbox} name="primary-image" checked={image.isPrimary} onChange={() => makePrimary(i)} />
                        <span>Primary</span>
                      </label>
                    )}
                    <button type="button" className={ui.linkDanger} onClick={() => remove(i)}>
                      Remove
                    </button>
                  </div>
                </figure>
              )
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className={cx(ui.btnGhost, uploading > 0 && 'pointer-events-none opacity-60')} aria-busy={uploading > 0}>
            {uploading > 0 && <Spinner />}
            {uploading > 0 ? `Uploading ${uploading}…` : '+ Upload photos or videos'}
            <input
              type="file"
              accept={`${IMAGE_TYPES},${VIDEO_TYPES}`}
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(Array.from(e.target.files ?? [])) // copy the list before clearing the input
                e.target.value = '' // lets you pick the same file again
              }}
            />
          </label>
          <span className={ui.hint}>JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV · up to {MAX_UPLOAD_LABEL} each</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="url"
            className={ui.rowInput}
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="…or paste an image link (https://…)"
          />
          <button
            type="button"
            className={ui.btnGhost}
            disabled={!link.trim().startsWith('http')}
            onClick={() => {
              onChange(add(link.trim(), 'IMAGE', images))
              setLink('')
            }}
          >
            Add link
          </button>
        </div>
        <ErrorBox message={error} />
      </div>
    </FormSection>
  )
}
