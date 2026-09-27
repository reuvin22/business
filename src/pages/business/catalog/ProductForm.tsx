import { useState } from 'react'
import { createProductFull, updateProductFull } from '../../../api/catalog'
import { listCategories } from '../../../api/directory'
import { brandsApi } from '../../../api/resources'
import type { ProductFull, ProductImage } from '../../../api/types'
import FieldForm from '../../../components/FieldForm'
import { ImagesEditor, PairsEditor, type Pair } from '../../../components/ListEditors'
import { productSections } from '../../../forms/definitions'
import { useLoad } from '../../../hooks/useLoad'
import { categoryOptions } from '../../../utils/options'
import PricesEditor from './PricesEditor'
import { formToProduct, newProductValues, productToForm } from './productValues'
import { newPriceRow, toPriceRows, toVariantRows, type PriceRow, type VariantRow } from './rows'
import VariantsEditor from './VariantsEditor'

type Props = {
  businessId: string
  currency: string
  /** The product to edit, or null to add a new one. */
  existing: ProductFull | null
  onSaved: (saved: ProductFull) => void
  onCancel: () => void
}

/** The whole product in one form: details, order rules, variants, selling prices, images, and specs. */
export default function ProductForm({ businessId, currency, existing, onSaved, onCancel }: Props) {
  const { data: brands = [] } = useLoad(() => brandsApi.list(businessId), [businessId])
  const { data: categories = [] } = useLoad(listCategories, [])

  const [variants, setVariants] = useState<VariantRow[]>(() => toVariantRows(existing?.variants ?? []))
  const [prices, setPrices] = useState<PriceRow[]>(() => (existing?.prices.length ? toPriceRows(existing.prices) : [newPriceRow()]))
  const [images, setImages] = useState<ProductImage[]>(existing?.product.images ?? [])
  const [specs, setSpecs] = useState<Pair[]>(existing?.product.specifications ?? [])

  const start = existing ? productToForm(existing.product) : newProductValues
  const sections = productSections(
    brands.map((b) => ({ value: b.id, label: b.brandName })),
    categoryOptions(categories),
  )

  return (
    <FieldForm
      title={existing ? `Edit ${existing.product.productName}` : 'Add product'}
      sections={sections}
      initial={start}
      submitLabel={existing ? 'Save changes' : 'Add product'}
      onCancel={onCancel}
      onSubmit={async (values) => {
        const body = {
          ...formToProduct(values, start),
          images: images.filter((image) => image.imageUrl.trim()).map((image, i) => ({ ...image, sortOrder: i })),
          specifications: specs.filter((spec) => spec.name.trim()),
          variants: variantsBody(variants),
          prices: pricesBody(prices),
        }
        const saved = existing
          ? await updateProductFull(businessId, existing.product.id, body)
          : await createProductFull(businessId, body)
        onSaved(saved)
      }}
    >
      <VariantsEditor rows={variants} onChange={setVariants} />
      <PricesEditor rows={prices} onChange={setPrices} variants={variants} currency={currency} />
      <ImagesEditor businessId={businessId} images={images} onChange={setImages} />
      <PairsEditor title="Specifications (optional)" pairs={specs} onChange={setSpecs} namePlaceholder="e.g. Shelf life" valuePlaceholder="e.g. 12 months" />
    </FieldForm>
  )
}

// ---- Turning the editor rows into the request body (errors are shown above the Save button) ----

/** "12.5" -> 12.5, "" -> null. Stops the save when the text is not a number. */
function toNumber(text: string, label: string): number | null {
  if (text.trim() === '') return null
  const number = Number(text)
  if (Number.isNaN(number) || number < 0) throw new Error(`${label} must be a number of 0 or more.`)
  return number
}

function variantsBody(rows: VariantRow[]) {
  return rows.map((row, i) => {
    const name = row.variantName.trim()
    if (!name) throw new Error(`Variant ${i + 1} needs a name.`)
    return {
      key: row.key,
      variantName: name,
      sku: row.sku.trim(),
      barcode: row.barcode.trim(),
      unit: row.unit,
      status: row.status,
      weightKg: toNumber(row.weightKg, `${name}: weight`),
      lengthCm: toNumber(row.lengthCm, `${name}: length`),
      widthCm: toNumber(row.widthCm, `${name}: width`),
      heightCm: toNumber(row.heightCm, `${name}: height`),
      attributes: Object.fromEntries(row.attributes.filter((a) => a.name.trim()).map((a) => [a.name.trim(), a.value])),
    }
  })
}

function pricesBody(rows: PriceRow[]) {
  if (rows.length === 0) throw new Error('Add at least one selling price.')
  return rows.map((row, i) => {
    const label = `Price ${i + 1}`
    const price = toNumber(row.price, label)
    if (price === null) throw new Error(`${label}: enter the price per unit.`)
    const from = toNumber(row.minimumQuantity, `${label}: from quantity`)
    const to = toNumber(row.maximumQuantity, `${label}: to quantity`)
    if (from === null || from < 1) throw new Error(`${label}: "from quantity" must be 1 or more.`)
    if (to !== null && to < from) throw new Error(`${label}: "to quantity" must be at least the "from quantity".`)
    return {
      id: row.id,
      variantKey: row.variantKey || null,
      price,
      minimumQuantity: from,
      maximumQuantity: to,
      priceType: row.priceType,
      customerType: row.customerType || null,
      effectiveFrom: row.effectiveFrom || null,
      effectiveUntil: row.effectiveUntil || null,
      status: row.status,
    }
  })
}
