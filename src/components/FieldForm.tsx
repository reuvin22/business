import { useState, type FormEvent, type ReactNode } from 'react'
import { uploadImage } from '../api/uploads'
import { fromFormState, missingRequired, toFormState, type FieldDef, type FormState, type Section, type Values } from '../forms/fields'
import { cx, ui } from '../styles'
import { shrinkImage } from '../utils/image'
import { BusyButton, ErrorBox, Modal, Spinner } from './ui'

type Props = {
  title?: string
  sections: Section[]
  initial: Values
  submitLabel: string
  /** Gets the API values. If it throws (e.g. an ApiError), the message is shown above the buttons. */
  onSubmit: (values: Values) => Promise<unknown> | void
  /** Given = the form opens as a dialog (modal) over the page, closed by Cancel. */
  onCancel?: () => void
  /** Width of the dialog; big forms (e.g. products) use 'xl'. */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Extra editors shown after the sections (e.g. opening hours). */
  children?: ReactNode
  /** Given = image fields get an upload button (images are stored under this business). */
  businessId?: string
}

export default function FieldForm({ title, sections, initial, submitLabel, onSubmit, onCancel, size = 'lg', children, businessId }: Props) {
  const [state, setState] = useState<FormState>(() => toFormState(sections, initial))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key: string, value: FormState[string]) => setState((s) => ({ ...s, [key]: value }))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const missing = missingRequired(sections, state)
    if (missing.length) return setError(`Please fill in: ${missing.join(', ')}.`)

    setError('')
    setSaving(true)
    try {
      await onSubmit(fromFormState(sections, state))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const form = (
    <form className={onCancel ? ui.modalForm : ui.formCard} onSubmit={handleSubmit} noValidate>
      {title && <h2 className={ui.h2}>{title}</h2>}

      {sections.map((section, sectionIndex) => (
        <FormSection key={section.title} title={section.title} hint={section.hint}>
          <div className={ui.formGrid}>
            {section.fields.map((field, i) => (
              <FieldInput
                key={field.key}
                field={field}
                value={state[field.key]}
                onChange={(value) => set(field.key, value)}
                autoFocus={sectionIndex === 0 && i === 0}
                businessId={businessId}
              />
            ))}
          </div>
        </FormSection>
      ))}

      {children}

      <ErrorBox message={error} />

      {/* In a dialog, the buttons stay at the bottom of the screen while a long form scrolls */}
      <div className={onCancel ? ui.modalActions : ui.formActions}>
        {onCancel && (
          <button type="button" className={ui.btnGhost} onClick={onCancel} disabled={saving}>
            Cancel
          </button>
        )}
        <BusyButton type="submit" className={ui.btnPrimary} busy={saving} busyLabel="Saving…">
          {submitLabel}
        </BusyButton>
      </div>
    </form>
  )

  if (!onCancel) return form
  // A click outside does not close it: a long form is easy to lose by accident. Cancel or Escape do.
  return (
    <Modal title={title ?? submitLabel} onClose={saving ? () => {} : onCancel} size={size} closeOnBackdrop={false}>
      {form}
    </Modal>
  )
}

/** A titled group of fields inside a form. */
export function FormSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="mt-1 min-w-0 border-0 p-0">
      <legend className={ui.legend}>{title}</legend>
      {hint && <p className={cx(ui.hint, '-mt-1 mb-3')}>{hint}</p>}
      {children}
    </fieldset>
  )
}

function FieldInput({
  field,
  value,
  onChange,
  autoFocus,
  businessId,
}: {
  field: FieldDef
  value: FormState[string]
  onChange: (value: FormState[string]) => void
  autoFocus: boolean
  businessId?: string
}) {
  const label = `${field.label}${field.required ? ' *' : ''}`
  const hint = field.hint && <span className="block text-[0.78rem] font-normal text-muted">{field.hint}</span>

  if (field.type === 'checkbox') {
    return (
      <label className={ui.checkboxLabel}>
        <input type="checkbox" className={ui.checkbox} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span>
          {field.label}
          {hint}
        </span>
      </label>
    )
  }

  if (field.type === 'checkboxes') {
    const chosen = Array.isArray(value) ? value : []
    const toggle = (option: string) =>
      onChange(chosen.includes(option) ? chosen.filter((v) => v !== option) : [...chosen, option])
    return (
      <div className="col-span-full flex flex-col gap-2">
        <span className="text-[0.88rem] font-semibold text-heading">{label}</span>
        {field.options?.length ? (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-4 gap-y-2">
            {field.options.map((option) => (
              <label key={option.value} className={ui.checkboxLabel}>
                <input
                  type="checkbox"
                  className={ui.checkbox}
                  checked={chosen.includes(option.value)}
                  onChange={() => toggle(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        ) : (
          <span className={ui.hint}>No choices available yet.</span>
        )}
        {hint}
      </div>
    )
  }

  const text = typeof value === 'string' ? value : ''
  if (field.type === 'image') {
    return <ImageInput label={label} hint={hint} field={field} url={text} onChange={onChange} businessId={businessId} />
  }

  let input: ReactNode
  if (field.type === 'textarea') {
    input = (
      <textarea
        rows={2}
        className={cx(ui.input, 'resize-y')}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        autoFocus={autoFocus}
      />
    )
  } else if (field.type === 'select') {
    input = (
      <select className={ui.input} value={text} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus}>
        <option value="">{field.required ? 'Select…' : '— None —'}</option>
        {field.options?.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  } else {
    input = (
      <input
        type={field.type ?? 'text'}
        className={ui.input}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        autoFocus={autoFocus}
        {...(field.type === 'number' ? { step: 'any' } : {})}
      />
    )
  }

  return (
    // Long text boxes take two columns (the full row on phones)
    <label className={cx(ui.label, field.type === 'textarea' && '@sm:col-span-2')}>
      {label}
      {input}
      {hint}
    </label>
  )
}

/** An image link with a preview, plus an upload button when we know which business it belongs to. */
function ImageInput({
  label,
  hint,
  field,
  url,
  onChange,
  businessId,
}: {
  label: string
  hint: ReactNode
  field: FieldDef
  url: string
  onChange: (value: string) => void
  businessId?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File | undefined) {
    if (!file || !businessId) return
    setError('')
    setUploading(true)
    try {
      const { blob, name } = await shrinkImage(file)
      onChange(await uploadImage(businessId, blob, name, 'business'))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="col-span-full flex flex-col gap-2">
      <span className="text-[0.88rem] font-semibold text-heading">{label}</span>
      {url && <img src={url} alt="" className="max-h-32 w-fit max-w-full rounded-lg bg-chip object-contain" />}
      <div className="flex flex-wrap items-center gap-2">
        {businessId && (
          <label className={cx(ui.btnGhost, uploading && 'pointer-events-none opacity-60')} aria-busy={uploading}>
            {uploading && <Spinner />}
            {uploading ? 'Uploading…' : url ? 'Replace image' : '+ Upload image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                handleFile(e.target.files?.[0])
                e.target.value = '' // lets you pick the same file again
              }}
            />
          </label>
        )}
        {url && (
          <button type="button" className={ui.linkDanger} onClick={() => onChange('')}>
            Remove
          </button>
        )}
      </div>
      <input
        type="url"
        className={ui.input}
        value={url}
        onChange={(e) => onChange(e.target.value)}
        placeholder={businessId ? `…or paste an image link (${field.placeholder ?? 'https://…'})` : field.placeholder}
        aria-label={`${field.label} link`}
      />
      {!businessId && <span className={ui.hint}>You can upload an image after the business is created.</span>}
      {hint}
      <ErrorBox message={error} />
    </div>
  )
}
