import { useState } from 'react'
import { locationsApi } from '../../../api/resources'
import type { DayHours, Location } from '../../../api/types'
import FieldForm from '../../../components/FieldForm'
import HoursEditor from '../../../components/HoursEditor'
import ResourceSection from '../../../components/ResourceSection'
import { labelOf } from '../../../constants/options'
import { locationSections, newLocationValues } from '../../../forms/definitions'
import { hoursSummary } from '../../../utils/hours'

export default function LocationsTab({ businessId, canEdit }: { businessId: string; canEdit: boolean }) {
  return (
    <ResourceSection<Location>
      title="Locations"
      description="Head office, branches, warehouses, stores… The primary location's city is shown in the directory."
      businessId={businessId}
      resource={locationsApi}
      sections={locationSections}
      canEdit={canEdit}
      addLabel="+ Add location"
      emptyText="No locations yet. Add at least one so buyers know where you are."
      columns={[
        { label: 'Name', render: (l) => <strong>{l.locationName}</strong> },
        { label: 'Type', render: (l) => labelOf(l.locationType) },
        { label: 'Address', render: (l) => [l.barangay, l.city, l.province].filter(Boolean).join(', ') || '—' },
        { label: 'Hours', render: (l) => <span className="block max-w-90 whitespace-normal">{hoursSummary(l.operatingHours)}</span> },
        { label: 'Primary', render: (l) => (l.isPrimary ? '★ Primary' : '') },
      ]}
      renderForm={(location, save, close) => <LocationForm location={location} save={save} close={close} />}
    />
  )
}

function LocationForm({
  location,
  save,
  close,
}: {
  location: Location | null
  save: (body: unknown) => Promise<void>
  close: () => void
}) {
  const [hours, setHours] = useState<DayHours[]>(location?.operatingHours ?? [])
  const start = location ?? newLocationValues

  return (
    <FieldForm
      title={location ? `Edit ${location.locationName}` : 'Add location'}
      sections={locationSections}
      initial={start}
      submitLabel={location ? 'Save changes' : 'Add location'}
      onCancel={close}
      onSubmit={(values) => save({ ...start, ...values, operatingHours: hours })}
    >
      <HoursEditor value={hours} onChange={setHours} />
    </FieldForm>
  )
}
