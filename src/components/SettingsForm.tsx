import { useState } from 'react'
import type { SingleResource } from '../api/resources'
import type { Saved } from '../api/types'
import type { Section } from '../forms/fields'
import { useLoad } from '../hooks/useLoad'
import { ui } from '../styles'
import DetailsView from './DetailsView'
import FieldForm from './FieldForm'
import { ErrorBox, Loading } from './ui'

type Props<T extends Saved> = {
  title: string
  description?: string
  businessId: string
  resource: SingleResource<T>
  sections: Section[]
  canEdit: boolean
  onSaved?: () => void
}

/** Shows details that exist once per business (legal info, delivery, ...) with an Edit button. */
export default function SettingsForm<T extends Saved>({
  title,
  description,
  businessId,
  resource,
  sections,
  canEdit,
  onSaved,
}: Props<T>) {
  const { data, loading, error, reload } = useLoad(() => resource.load(businessId), [businessId])
  const [editing, setEditing] = useState(false)

  if (loading && !data) return <Loading />
  if (!data) return <ErrorBox message={error} />

  return (
    <section className={ui.section}>
      <div className={ui.sectionHead}>
        <div>
          <h2 className={ui.h2}>{title}</h2>
          {description && <p className={ui.hint}>{description}</p>}
        </div>
        {canEdit && !editing && (
          <button type="button" className={ui.btnGhost} onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <FieldForm
          sections={sections}
          initial={data}
          submitLabel="Save changes"
          onCancel={() => setEditing(false)}
          onSubmit={async (values) => {
            await resource.save(businessId, { ...data, ...values })
            setEditing(false)
            reload()
            onSaved?.()
          }}
        />
      ) : (
        <DetailsView sections={sections} values={data} />
      )}
    </section>
  )
}
