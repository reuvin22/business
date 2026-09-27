import { useState, type FormEvent, type ReactNode } from 'react'
import { fromFormState, missingRequired, toFormState, type FieldDef, type FormState, type Section, type Values } from '../forms/fields'

type Props = {
  title?: string
  sections: Section[]
  initial: Values
  submitLabel: string
  /** Gets the API values. If it throws (e.g. an ApiError), the message is shown above the buttons. */
  onSubmit: (values: Values) => Promise<unknown> | void
  onCancel?: () => void
  /** Extra editors shown after the sections (e.g. opening hours). */
  children?: ReactNode
}

export default function FieldForm({ title, sections, initial, submitLabel, onSubmit, onCancel, children }: Props) {
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

  return (
    <form className="card form-card" onSubmit={handleSubmit} noValidate>
      {title && <h2>{title}</h2>}

      {sections.map((section, sectionIndex) => (
        <fieldset key={section.title} className="form-section">
          <legend>{section.title}</legend>
          {section.hint && <p className="hint section-hint">{section.hint}</p>}
          <div className="form-grid">
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
        </fieldset>
      ))}

      {children}

      {error && <p className="alert alert-error pre-line">{error}</p>}

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-auto" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
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
  const hint = field.hint && <span className="field-hint">{field.hint}</span>

  if (field.type === 'checkbox') {
    return (
      <label className="checkbox-label">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
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
      <div className="span-all field-group">
        <span className="field-label">{label}</span>
        {field.options?.length ? (
          <div className="check-grid">
            {field.options.map((option) => (
              <label key={option.value} className="checkbox-label">
                <input type="checkbox" checked={chosen.includes(option.value)} onChange={() => toggle(option.value)} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        ) : (
          <span className="hint">No choices available yet.</span>
        )}
        {hint}
      </div>
    )
  }

  const text = typeof value === 'string' ? value : ''
  let input: ReactNode
  if (field.type === 'textarea') {
    input = <textarea rows={3} value={text} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} autoFocus={autoFocus} />
  } else if (field.type === 'select') {
    input = (
      <select value={text} onChange={(e) => onChange(e.target.value)} autoFocus={autoFocus}>
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
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        autoFocus={autoFocus}
        {...(field.type === 'number' ? { step: 'any' } : {})}
      />
    )
  }

  return (
    <label className={field.type === 'textarea' ? 'span-all' : undefined}>
      {label}
      {input}
      {hint}
    </label>
  )
}
