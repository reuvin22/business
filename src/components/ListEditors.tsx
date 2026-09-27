// Editors for small lists inside a form: product images and name/value pairs.
import type { ProductImage } from '../api/types'
import { cx, ui } from '../styles'
import { FormSection } from './FieldForm'

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

/** Image links with one primary image. */
export function ImagesEditor({ images, onChange }: { images: ProductImage[]; onChange: (images: ProductImage[]) => void }) {
  const update = (index: number, changes: Partial<ProductImage>) =>
    onChange(images.map((image, i) => (i === index ? { ...image, ...changes } : image)))
  const makePrimary = (index: number) => onChange(images.map((image, i) => ({ ...image, isPrimary: i === index })))

  return (
    <FormSection title="Images" hint="Paste image links (e.g. from Google Drive or your website). The primary image is shown first.">
      <div className="flex flex-col items-start gap-2.5">
        {images.map((image, i) => (
          <div key={i} className={rowClass}>
            {image.imageUrl ? <img src={image.imageUrl} alt="" className={ui.thumb} /> : <span className={ui.thumb} />}
            <input
              type="url"
              className={cx(ui.input, 'flex-1')}
              value={image.imageUrl}
              onChange={(e) => update(i, { imageUrl: e.target.value })}
              placeholder="https://…/photo.jpg"
            />
            <label className={ui.checkboxLabel}>
              <input type="radio" className={ui.checkbox} name="primary-image" checked={image.isPrimary} onChange={() => makePrimary(i)} />
              <span>Primary</span>
            </label>
            <button type="button" className={ui.linkDanger} onClick={() => onChange(images.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className={ui.link}
          onClick={() => onChange([...images, { imageUrl: '', sortOrder: images.length, isPrimary: images.length === 0 }])}
        >
          + Add image
        </button>
      </div>
    </FormSection>
  )
}
