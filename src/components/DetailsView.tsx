import type { ReactNode } from 'react'
import type { FieldDef, Section, Values } from '../forms/fields'
import { cx, ui } from '../styles'
import { formatDate, formatNumber } from '../utils/format'

/** Shows saved values with the same sections as their form (read-only). */
export default function DetailsView({ sections, values }: { sections: Section[]; values: Values }) {
  return (
    <DetailsGrid>
      {sections.map((section) => (
        <DetailsCard key={section.title} title={section.title}>
          {section.fields.map((field) => (
            <DetailItem
              key={field.key}
              label={field.label}
              wide={field.type === 'textarea' || field.type === 'checkboxes'}
            >
              <DisplayValue field={field} value={values[field.key]} />
            </DetailItem>
          ))}
        </DetailsCard>
      ))}
    </DetailsGrid>
  )
}

/** Cards side by side (one column on phones). */
export function DetailsGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-4 max-sm:grid-cols-1">{children}</div>
}

/** A card with a title and label/value rows. */
export function DetailsCard({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cx(ui.card, 'px-6 py-5.5', className)}>
      <h3 className={ui.h3}>{title}</h3>
      <dl className="m-0 grid grid-cols-2 gap-4">{children}</dl>
    </section>
  )
}

/** One label + value inside a DetailsCard. `wide` takes the full row. */
export function DetailItem({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? 'col-span-full' : undefined}>
      <dt className="text-[0.75rem] tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 wrap-break-word text-heading [&_a]:text-accent">{children}</dd>
    </div>
  )
}

export function DisplayValue({ field, value }: { field: FieldDef; value: unknown }) {
  const notSet = <span className="text-[0.9rem] text-muted italic">Not set</span>
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
