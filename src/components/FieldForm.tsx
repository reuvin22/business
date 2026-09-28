import { useState, type FormEvent, type ReactNode } from 'react'
import { fromFormState, missingRequired, toFormState, type FieldDef, type FormState, type Section, type Values } from '../forms/fields'
import { cx, ui } from '../styles'
import { BusyButton, ErrorBox, Modal } from './ui'

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
}

export default function FieldForm({ title, sections, initial, submitLabel, onSubmit, onCancel, size = 'lg', children }: Props) {
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
}: {
  field: FieldDef
  value: FormState[string]
  onChange: (value: FormState[string]) => void
  autoFocus: boolean
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
