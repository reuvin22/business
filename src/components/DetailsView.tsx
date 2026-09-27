import type { FieldDef, Section, Values } from '../forms/fields'
import { formatDate, formatNumber } from '../utils/format'

/** Shows saved values with the same sections as their form (read-only). */
export default function DetailsView({ sections, values }: { sections: Section[]; values: Values }) {
  return (
    <div className="details-sections">
      {sections.map((section) => (
        <section key={section.title} className="card details-card">
          <h3>{section.title}</h3>
          <dl className="details">
            {section.fields.map((field) => (
              <div key={field.key} className={field.type === 'textarea' || field.type === 'checkboxes' ? 'span-all' : undefined}>
                <dt>{field.label}</dt>
                <dd>
                  <DisplayValue field={field} value={values[field.key]} />
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}

export function DisplayValue({ field, value }: { field: FieldDef; value: unknown }) {
  const notSet = <span className="not-set">Not set</span>
  const optionLabel = (v: string) => field.options?.find((o) => o.value === v)?.label ?? v

  if (field.type === 'checkbox') return <>{value ? 'Yes' : 'No'}</>
  if (field.type === 'checkboxes') {
    const list = Array.isArray(value) ? (value as string[]) : []
    return list.length ? <>{list.map(optionLabel).join(', ')}</> : notSet
  }
  if (value === null || value === undefined || value === '') return notSet
  if (field.type === 'select') return <>{optionLabel(String(value))}</>
  if (field.type === 'number') return <>{formatNumber(Number(value))}</>
  if (field.type === 'date') return <>{formatDate(String(value))}</>
  if (field.type === 'url') {
    return (
      <a href={String(value)} target="_blank" rel="noreferrer">
        {String(value)}
      </a>
    )
  }
  if (field.type === 'email') return <a href={`mailto:${value}`}>{String(value)}</a>
  return <>{String(value)}</>
}
