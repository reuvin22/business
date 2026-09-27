// The building blocks for forms. A form is a list of sections, each with fields:
//
//   { title: 'Contact', fields: [{ key: 'email', label: 'Email', type: 'email' }] }
//
// `key` is the field name the API uses. FieldForm renders the inputs, and the two
// helpers below convert between API values (numbers, null, lists) and input text.
import type { Option } from '../constants/options'

export type FieldType =
  | 'text'
  | 'email'
  | 'tel'
  | 'url'
  | 'date'
  | 'time'
  | 'number'
  | 'textarea'
  | 'select' // one choice from `options`
  | 'checkbox' // true / false
  | 'checkboxes' // several choices from `options` (a list)

export type FieldDef = {
  key: string
  label: string
  type?: FieldType
  options?: Option[]
  required?: boolean
  placeholder?: string
  hint?: string
  /** For a select: send null (instead of "") when nothing is chosen. Use for optional choices. */
  emptyAsNull?: boolean
}

export type Section = { title: string; hint?: string; fields: FieldDef[] }

/** Values as the API sends/receives them. */
export type Values = Record<string, unknown>

/** Values as the inputs hold them (text, true/false, or a list of choices). */
export type FormState = Record<string, string | boolean | string[]>

const allFields = (sections: Section[]) => sections.flatMap((section) => section.fields)

/** API values -> input values */
export function toFormState(sections: Section[], values: Values): FormState {
  const state: FormState = {}
  for (const field of allFields(sections)) {
    const value = values[field.key]
    if (field.type === 'checkbox') state[field.key] = Boolean(value)
    else if (field.type === 'checkboxes') state[field.key] = Array.isArray(value) ? (value as string[]) : []
    else state[field.key] = value === null || value === undefined ? '' : String(value)
  }
  return state
}

/** Input values -> API values. Empty numbers and dates become null (and empty selects marked emptyAsNull). */
export function fromFormState(sections: Section[], state: FormState): Values {
  const values: Values = {}
  for (const field of allFields(sections)) {
    const value = state[field.key]
    if (field.type === 'checkbox' || field.type === 'checkboxes') {
      values[field.key] = value
      continue
    }
    const text = String(value ?? '').trim()
    if (field.type === 'number') values[field.key] = text === '' ? null : Number(text)
    else if (field.type === 'date') values[field.key] = text === '' ? null : text
    else if (field.type === 'select') values[field.key] = text === '' && field.emptyAsNull ? null : text
    else values[field.key] = text
  }
  return values
}

/** Labels of required fields that are still empty. */
export function missingRequired(sections: Section[], state: FormState): string[] {
  return allFields(sections)
    .filter((field) => {
      if (!field.required) return false
      const value = state[field.key]
      return Array.isArray(value) ? value.length === 0 : typeof value === 'string' && value.trim() === ''
    })
    .map((field) => field.label)
}
