import { useState, type ReactNode } from 'react'
import type { ListResource } from '../api/resources'
import type { Saved } from '../api/types'
import type { Section, Values } from '../forms/fields'
import { useLoad } from '../hooks/useLoad'
import FieldForm from './FieldForm'
import { ConfirmButton, EmptyState, ErrorBox, Loading } from './ui'

export type Column<T> = { label: string; render: (item: T) => ReactNode; className?: string }

type Props<T extends Saved> = {
  title: string
  description?: string
  businessId: string
  resource: ListResource<T>
  sections: Section[]
  columns: Column<T>[]
  canEdit: boolean
  /** Starting values for the "add" form. */
  newValues?: Values
  /** Turns form values into the request body. Default: the item's current values + the form values. */
  toBody?: (values: Values, item: T | null) => unknown
  /** Replace the standard form (e.g. to add extra editors). Call `save(body)` to save. */
  renderForm?: (item: T | null, save: (body: unknown) => Promise<void>, close: () => void) => ReactNode
  /** Called after anything changes, e.g. to refresh other data on the page. */
  onChange?: () => void
  addLabel?: string
  emptyText?: string
}

/** A table of items with Add / Edit / Delete. Used for contacts, brands, documents, etc. */
export default function ResourceSection<T extends Saved>({
  title,
  description,
  businessId,
  resource,
  sections,
  columns,
  canEdit,
  newValues = {},
  toBody,
  renderForm,
  onChange,
  addLabel = '+ Add',
  emptyText = 'Nothing added yet.',
}: Props<T>) {
  const { data: items, loading, error, reload } = useLoad(() => resource.list(businessId), [businessId])
  // null = form closed, 'new' = adding, otherwise the item being edited
  const [editing, setEditing] = useState<T | 'new' | null>(null)
  const [actionError, setActionError] = useState('')

  const editingItem = editing === 'new' ? null : editing
  const close = () => setEditing(null)

  async function save(body: unknown) {
    if (editingItem) await resource.update(businessId, editingItem.id, body)
    else await resource.create(businessId, body)
    close()
    reload()
    onChange?.()
  }

  async function remove(item: T) {
    setActionError('')
    try {
      await resource.remove(businessId, item.id)
      reload()
      onChange?.()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  return (
    <section className="resource-section">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {description && <p className="hint">{description}</p>}
        </div>
        {canEdit && editing === null && (
          <button type="button" className="btn btn-ghost" onClick={() => setEditing('new')}>
            {addLabel}
          </button>
        )}
      </div>

      {editing !== null &&
        (renderForm ? (
          renderForm(editingItem, save, close)
        ) : (
          <FieldForm
            key={editingItem?.id ?? 'new'}
            title={editingItem ? `Edit ${title.toLowerCase()}` : `Add ${title.toLowerCase()}`}
            sections={sections}
            initial={editingItem ?? newValues}
            submitLabel={editingItem ? 'Save changes' : 'Add'}
            onCancel={close}
            onSubmit={(values) => save(toBody ? toBody(values, editingItem) : { ...(editingItem ?? newValues), ...values })}
          />
        ))}

      <ErrorBox message={error || actionError} />
      {loading && !items ? (
        <Loading />
      ) : !items?.length ? (
        editing === null && <EmptyState text={emptyText} />
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.label} className={column.className}>
                    {column.label}
                  </th>
                ))}
                {canEdit && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  {columns.map((column) => (
                    <td key={column.label} className={column.className}>
                      {column.render(item)}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="actions">
                      <button type="button" className="link" onClick={() => setEditing(item)}>
                        Edit
                      </button>
                      <ConfirmButton label="Delete" confirmLabel="Confirm delete" onConfirm={() => remove(item)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
