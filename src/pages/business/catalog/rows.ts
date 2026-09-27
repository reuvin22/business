// The editor rows of the product form (variants and price tiers), and converting saved
// data into rows. Numbers are kept as text while editing, like input boxes hold them.
import type { Price, Variant } from '../../../api/types'
import type { Pair } from '../../../components/ListEditors'

/** One variant while it is being edited. */
export type VariantRow = {
  key: string // the variant's id, or "new-…" for a new one (price tiers point to this)
  variantName: string
  sku: string
  barcode: string
  unit: string
  status: string
  weightKg: string
  lengthCm: string
  widthCm: string
  heightCm: string
  attributes: Pair[]
}

const text = (value: number | null) => (value === null ? '' : String(value))

export function toVariantRows(variants: Variant[]): VariantRow[] {
  return variants.map((v) => ({
    key: v.id,
    variantName: v.variantName,
    sku: v.sku,
    barcode: v.barcode,
    unit: v.unit,
    status: v.status,
    weightKg: text(v.weightKg),
    lengthCm: text(v.lengthCm),
    widthCm: text(v.widthCm),
    heightCm: text(v.heightCm),
    attributes: Object.entries(v.attributes).map(([name, value]) => ({ name, value })),
  }))
}

let nextVariantKey = 1
export const newVariantRow = (): VariantRow => ({
  key: `new-${nextVariantKey++}`,
  variantName: '',
  sku: '',
  barcode: '',
  unit: '',
  status: 'ACTIVE',
  weightKg: '',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  attributes: [],
})

/** One price tier while it is being edited. */
export type PriceRow = {
  rowKey: string // only for React lists
  id: string | null // the tier's id when it already exists
  variantKey: string // '' = the whole product; otherwise a VariantRow key
  price: string
  minimumQuantity: string
  maximumQuantity: string
  priceType: string
  customerType: string // '' = every buyer
  effectiveFrom: string
  effectiveUntil: string
  status: string
}

let nextPriceKey = 1
export const newPriceRow = (): PriceRow => ({
  rowKey: `price-${nextPriceKey++}`,
  id: null,
  variantKey: '',
  price: '',
  minimumQuantity: '1',
  maximumQuantity: '',
  priceType: 'WHOLESALE',
  customerType: '',
  effectiveFrom: '',
  effectiveUntil: '',
  status: 'ACTIVE',
})

export function toPriceRows(prices: Price[]): PriceRow[] {
  return prices.map((p) => ({
    rowKey: p.id,
    id: p.id,
    variantKey: p.variantId ?? '', // existing variants use their id as key
    price: String(p.price),
    minimumQuantity: String(p.minimumQuantity),
    maximumQuantity: p.maximumQuantity === null ? '' : String(p.maximumQuantity),
    priceType: p.priceType,
    customerType: p.customerType ?? '',
    effectiveFrom: p.effectiveFrom ?? '',
    effectiveUntil: p.effectiveUntil ?? '',
    status: p.status,
  }))
}
