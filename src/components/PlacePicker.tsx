import { useId } from 'react'
import { listBarangays, listCities, listCountries, listProvinces, listRegions, type Place } from '../api/geo'
import { useLoad } from '../hooks/useLoad'
import { cx, ui } from '../styles'

/** Names, as saved (and as typed in addresses). */
export type PlaceValue = { country: string; region: string; province: string; city: string; barangay: string }

const PHILIPPINES = 'PH'
const none = () => Promise.resolve<Place[]>([])

/** The place in a list with this name (any letter case), so its code can load the next level. */
const find = (places: Place[] | undefined, name: string) =>
  name ? places?.find((p) => p.name.toLowerCase() === name.trim().toLowerCase()) : undefined

/**
 * Country > region > province > city > barangay, each a search-as-you-type list filled from the
 * level above (Philippines: the official PSGC lists; elsewhere: states and cities).
 * Leave the lower levels empty to cover a whole area. If a list cannot load, you can still type the name.
 */
export default function PlacePicker({ value, onChange }: { value: PlaceValue; onChange: (value: PlaceValue) => void }) {
  const countries = useLoad(listCountries, [])
  const country = find(countries.data, value.country)
  const ph = country?.code === PHILIPPINES

  const regions = useLoad(() => (country ? listRegions(country.code) : none()), [country?.code])
  const region = find(regions.data, value.region)

  const provinces = useLoad(() => (ph && region ? listProvinces(PHILIPPINES, region.code) : none()), [ph, region?.code])
  const province = find(provinces.data, value.province)
  // Metro Manila has no provinces: its cities come straight from the region
  const noProvinces = ph && !!region && provinces.data?.length === 0 && !provinces.loading

  const cityParent = ph ? (province?.code ?? (noProvinces ? '' : undefined)) : region?.code
  const cities = useLoad(
    () => (country && region && cityParent !== undefined ? listCities(country.code, region.code, cityParent) : none()),
    [country?.code, region?.code, cityParent],
  )
  const city = find(cities.data, value.city)

  const barangays = useLoad(() => (ph && city ? listBarangays(PHILIPPINES, city.code) : none()), [ph, city?.code])

  // Changing a level clears the levels under it
  const set = (changes: Partial<PlaceValue>, clear: (keyof PlaceValue)[]) =>
    onChange({ ...value, ...Object.fromEntries(clear.map((key) => [key, ''])), ...changes })

  return (
    <div className={ui.formGrid}>
      <PlaceInput
        label="Country *"
        value={value.country}
        places={countries.data}
        error={countries.error}
        onChange={(country) => set({ country }, ['region', 'province', 'city', 'barangay'])}
      />
      <PlaceInput
        label={ph ? 'Region' : 'State / region'}
        value={value.region}
        places={regions.data}
        error={regions.error}
        waitingFor={value.country ? '' : 'a country'}
        onChange={(region) => set({ region }, ['province', 'city', 'barangay'])}
      />
      {ph && !noProvinces && (
        <PlaceInput
          label="Province"
          value={value.province}
          places={provinces.data}
          error={provinces.error}
          waitingFor={value.region ? '' : 'a region'}
          onChange={(province) => set({ province }, ['city', 'barangay'])}
        />
      )}
      <PlaceInput
        label={ph ? 'City / municipality' : 'City'}
        value={value.city}
        places={cities.data}
        error={cities.error}
        waitingFor={!value.region ? 'a region' : ph && !noProvinces && !value.province ? 'a province' : ''}
        onChange={(city) => set({ city }, ['barangay'])}
      />
      {ph && (
        <PlaceInput
          label="Barangay"
          value={value.barangay}
          places={barangays.data}
          error={barangays.error}
          waitingFor={value.city ? '' : 'a city or municipality'}
          onChange={(barangay) => set({ barangay }, [])}
        />
      )}
    </div>
  )
}

/** A text box that suggests the places of its list as you type. */
function PlaceInput(props: {
  label: string
  value: string
  places: Place[] | undefined
  error: string
  waitingFor?: string
  onChange: (name: string) => void
}) {
  const listId = useId()
  const { places, error, waitingFor } = props
  // A list is only asked for once the level above is one of its known places
  const loading = !waitingFor && !error && places === undefined

  return (
    <label className={ui.label}>
      {props.label}
      <input
        className={ui.input}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        list={listId}
        autoComplete="off"
        disabled={!!waitingFor && !props.value}
        placeholder={waitingFor ? `Choose ${waitingFor} first` : loading ? 'Loading…' : places?.length ? 'Type to search' : 'Type the name'}
      />
      <datalist id={listId}>
        {places?.map((place) => (
          <option key={place.code} value={place.name} />
        ))}
      </datalist>
      {error && <span className={cx(ui.hint, 'font-normal')}>{error}</span>}
    </label>
  )
}
