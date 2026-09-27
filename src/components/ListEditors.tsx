// Editors for small lists inside a form: product images and name/value pairs.
import type { ProductImage } from '../api/types'

export type Pair = { name: string; value: string }

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
    <fieldset className="form-section">
      <legend>{title}</legend>
      <div className="list-editor">
        {pairs.map((pair, i) => (
          <div key={i} className="list-row">
            <input value={pair.name} onChange={(e) => update(i, { name: e.target.value })} placeholder={namePlaceholder} />
            <input value={pair.value} onChange={(e) => update(i, { value: e.target.value })} placeholder={valuePlaceholder} />
            <button type="button" className="link danger" onClick={() => onChange(pairs.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="link" onClick={() => onChange([...pairs, { name: '', value: '' }])}>
          + Add row
        </button>
      </div>
    </fieldset>
  )
}

/** Image links with one primary image. */
export function ImagesEditor({ images, onChange }: { images: ProductImage[]; onChange: (images: ProductImage[]) => void }) {
  const update = (index: number, changes: Partial<ProductImage>) =>
    onChange(images.map((image, i) => (i === index ? { ...image, ...changes } : image)))
  const makePrimary = (index: number) => onChange(images.map((image, i) => ({ ...image, isPrimary: i === index })))

  return (
    <fieldset className="form-section">
      <legend>Images</legend>
      <p className="hint section-hint">Paste image links (e.g. from Google Drive or your website). The primary image is shown first.</p>
      <div className="list-editor">
        {images.map((image, i) => (
          <div key={i} className="list-row">
            {image.imageUrl ? <img src={image.imageUrl} alt="" className="thumb" /> : <span className="thumb" />}
            <input
              type="url"
              value={image.imageUrl}
              onChange={(e) => update(i, { imageUrl: e.target.value })}
              placeholder="https://…/photo.jpg"
            />
            <label className="checkbox-label">
              <input type="radio" name="primary-image" checked={image.isPrimary} onChange={() => makePrimary(i)} />
              <span>Primary</span>
            </label>
            <button type="button" className="link danger" onClick={() => onChange(images.filter((_, j) => j !== i))}>
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          className="link"
          onClick={() => onChange([...images, { imageUrl: '', sortOrder: images.length, isPrimary: images.length === 0 }])}
        >
          + Add image
        </button>
      </div>
    </fieldset>
  )
}
