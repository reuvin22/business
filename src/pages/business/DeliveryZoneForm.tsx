import { useState } from 'react'
import type { DeliveryZone } from '../../api/types'
import FieldForm, { FormSection } from '../../components/FieldForm'
import PlacePicker, { type PlaceValue } from '../../components/PlacePicker'
import { deliveryZoneSections, newDeliveryZoneValues } from '../../forms/definitions'

/** A delivery zone: the area (picked from the official place lists) and its fee. */
export default function DeliveryZoneForm({
  zone,
  save,
  close,
}: {
  zone: DeliveryZone | null
  save: (body: unknown) => Promise<void>
  close: () => void
}) {
  const start = zone ?? newDeliveryZoneValues
  const [place, setPlace] = useState<PlaceValue>({
    country: zone ? zone.country : newDeliveryZoneValues.country,
    region: zone?.region ?? '',
    province: zone?.province ?? '',
    city: zone?.city ?? '',
    barangay: zone?.barangay ?? '',
  })

  return (
    <FieldForm
      title={zone ? 'Edit delivery zone' : 'Add delivery zone'}
      sections={deliveryZoneSections}
      initial={start}
      submitLabel={zone ? 'Save changes' : 'Add zone'}
      onCancel={close}
      intro={
        <FormSection
          title="Area"
          hint="Pick as far down as you need: a whole country, a region, a province, a city, or one barangay. The most specific zone wins."
        >
          <PlacePicker value={place} onChange={setPlace} />
        </FormSection>
      }
      onSubmit={(values) => {
        if (!place.country.trim()) throw new Error('Choose a country.')
        const trimmed = Object.fromEntries(Object.entries(place).map(([key, name]) => [key, name.trim()]))
        return save({ ...start, ...values, ...trimmed })
      }}
    />
  )
}
