import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as catalog from '../../api/catalog'
import { listCategories } from '../../api/directory'
import type { ListResource } from '../../api/resources'
import { brandsApi } from '../../api/resources'
import type { Price, Product, ProductImage, Variant } from '../../api/types'
import { useBusiness } from '../../businessContext'
import DetailsView from '../../components/DetailsView'
import FieldForm from '../../components/FieldForm'
import { ImagesEditor, PairsEditor, type Pair } from '../../components/ListEditors'
import ResourceSection from '../../components/ResourceSection'
import { Badge, ConfirmButton, ErrorBox, Loading, PageHeader, Tabs } from '../../components/ui'
import { labelOf } from '../../constants/options'
import * as forms from '../../forms/definitions'
import { useLoad } from '../../hooks/useLoad'
import { useTab } from '../../hooks/useTab'
import { formatDate, formatMoney, formatNumber } from '../../utils/format'
import { categoryOptions } from '../../utils/options'
import { formToProduct, productToForm } from './catalog/productForm'

const TABS = [
  { key: 'details', label: 'Details' },
  { key: 'variants', label: 'Variants' },
  { key: 'prices', label: 'Price tiers' },
]

export default function ProductDetailPage() {
  const { business, can } = useBusiness()
  const { productId = '' } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useTab(TABS)
  const product = useLoad(() => catalog.getProduct(business.id, productId), [business.id, productId])
  const variants = useLoad(() => catalog.listVariants(business.id, productId), [business.id, productId])
  const [deleteError, setDeleteError] = useState('')

  const canEdit = can('products.manage')
  const backLink = (
    <Link to={`/business/${business.id}/products`} className="back-link">
      ← All products
    </Link>
  )

  if (!product.data) {
    return (
      <div className="page">
        {backLink}
        {product.error ? <ErrorBox message={product.error} /> : <Loading />}
      </div>
    )
  }

  // The variant and price lists use ResourceSection, which expects this shape
  const variantsResource: ListResource<Variant> = {
    list: () => catalog.listVariants(business.id, productId),
    create: (_, body) => catalog.createVariant(business.id, productId, body),
    update: (_, id, body) => catalog.updateVariant(business.id, productId, id, body),
    remove: (_, id) => catalog.deleteVariant(business.id, productId, id),
  }
  const pricesResource: ListResource<Price> = {
    list: () => catalog.listPrices(business.id, productId),
    create: (_, body) => catalog.createPrice(business.id, productId, body),
    update: (_, id, body) => catalog.updatePrice(business.id, productId, id, body),
    remove: (_, id) => catalog.deletePrice(business.id, productId, id),
  }
  const variantOptions = (variants.data ?? []).map((v) => ({ value: v.id, label: v.variantName }))
  const variantName = (id: string | null) => (id ? (variants.data ?? []).find((v) => v.id === id)?.variantName ?? '?' : 'All')

  return (
    <div className="page">
      {backLink}
      <PageHeader
        title={product.data.productName}
        subtitle={`${labelOf(product.data.visibility)} · ${product.data.unit}`}
        actions={<Badge value={product.data.status} />}
      />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'details' && <DetailsTab product={product.data} canEdit={canEdit} onSaved={product.reload} />}

      {tab === 'variants' && (
        <ResourceSection<Variant>
          title="Variants"
          description="Different versions of this product, e.g. 290ml, 1.5L, 2L. Each can have its own SKU, stock, and prices."
          businessId={business.id}
          resource={variantsResource}
          sections={forms.variantSections}
          newValues={forms.newVariantValues}
          canEdit={canEdit}
          addLabel="+ Add variant"
          onChange={variants.reload}
          columns={[
            { label: 'Variant', render: (v) => <strong>{v.variantName}</strong> },
            { label: 'SKU', render: (v) => v.sku || '—' },
            {
              label: 'Attributes',
              render: (v) => Object.entries(v.attributes).map(([k, val]) => `${k}: ${val}`).join(', ') || '—',
            },
            { label: 'Weight', render: (v) => (v.weightKg ? `${formatNumber(v.weightKg)} kg` : '—') },
            { label: 'Status', render: (v) => <Badge value={v.status} /> },
          ]}
          renderForm={(variant, save, close) => <VariantForm variant={variant} save={save} close={close} />}
        />
      )}

      {tab === 'prices' && (
        <ResourceSection<Price>
          title="Price tiers"
          description="Buyers see these prices. Add tiers for bigger quantities, e.g. 1–9 = 120, 10–49 = 110, 50+ = 100."
          businessId={business.id}
          resource={pricesResource}
          sections={forms.priceSections(variantOptions)}
          newValues={{ ...forms.newPriceValues, currency: business.currency }}
          toBody={(values, price) => ({ ...(price ?? forms.newPriceValues), ...values, currency: business.currency })}
          canEdit={canEdit}
          addLabel="+ Add price tier"
          emptyText="No prices yet. Buyers cannot order this product until it has a price."
          columns={[
            { label: 'Type', render: (p) => labelOf(p.priceType) },
            { label: 'Price', className: 'num', render: (p) => <strong>{formatMoney(p.price, p.currency)}</strong> },
            { label: 'Quantity', render: (p) => `${p.minimumQuantity}${p.maximumQuantity ? `–${p.maximumQuantity}` : '+'}` },
            { label: 'Variant', render: (p) => variantName(p.variantId) },
            { label: 'For', render: (p) => (p.customerType ? labelOf(p.customerType) : 'Everyone') },
            {
              label: 'Valid',
              render: (p) =>
                p.effectiveFrom || p.effectiveUntil ? `${formatDate(p.effectiveFrom)} – ${formatDate(p.effectiveUntil)}` : 'Always',
            },
            { label: 'Status', render: (p) => <Badge value={p.status} /> },
          ]}
        />
      )}

      {canEdit && tab === 'details' && (
        <section className="card details-card danger-zone">
          <h3>Delete product</h3>
          <ErrorBox message={deleteError} />
          <div className="form-actions">
            <span className="confirm-text">Also deletes its variants, prices, and stock records. Past orders keep their copy.</span>
            <ConfirmButton
              label="Delete product"
              confirmLabel="Yes, delete"
              onConfirm={async () => {
                try {
                  await catalog.deleteProduct(business.id, productId)
                  navigate(`/business/${business.id}/products`, { replace: true })
                } catch (err) {
                  setDeleteError((err as Error).message)
                }
              }}
            />
          </div>
        </section>
      )}
    </div>
  )
}

function DetailsTab({ product, canEdit, onSaved }: { product: Product; canEdit: boolean; onSaved: () => void }) {
  const { business } = useBusiness()
  const { data: brands = [] } = useLoad(() => brandsApi.list(business.id), [business.id])
  const { data: categories = [] } = useLoad(listCategories, [])
  const [editing, setEditing] = useState(false)
  const [images, setImages] = useState<ProductImage[]>(product.images)
  const [specs, setSpecs] = useState<Pair[]>(product.specifications)

  const sections = forms.productSections(
    brands.map((b) => ({ value: b.id, label: b.brandName })),
    categoryOptions(categories),
  )

  if (editing) {
    return (
      <FieldForm
        title="Edit product"
        sections={sections}
        initial={productToForm(product)}
        submitLabel="Save changes"
        onCancel={() => setEditing(false)}
        onSubmit={async (values) => {
          const body = formToProduct(values, product)
          body.images = images.filter((image) => image.imageUrl.trim()).map((image, i) => ({ ...image, sortOrder: i }))
          body.specifications = specs.filter((spec) => spec.name.trim())
          await catalog.updateProduct(business.id, product.id, body)
          setEditing(false)
          onSaved()
        }}
      >
        <ImagesEditor images={images} onChange={setImages} />
        <PairsEditor title="Specifications" pairs={specs} onChange={setSpecs} namePlaceholder="e.g. Shelf life" valuePlaceholder="e.g. 12 months" />
      </FieldForm>
    )
  }

  return (
    <>
      <div className="section-head">
        <div className="image-strip">
          {product.images.map((image) => (
            <img key={image.imageUrl} src={image.imageUrl} alt="" className={image.isPrimary ? 'primary' : undefined} />
          ))}
        </div>
        {canEdit && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setImages(product.images)
              setSpecs(product.specifications)
              setEditing(true)
            }}
          >
            Edit product
          </button>
        )}
      </div>
      <DetailsView sections={sections} values={productToForm(product)} />
      {product.specifications.length > 0 && (
        <section className="card details-card">
          <h3>Specifications</h3>
          <dl className="details">
            {product.specifications.map((spec) => (
              <div key={spec.name}>
                <dt>{spec.name}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </>
  )
}

function VariantForm({ variant, save, close }: { variant: Variant | null; save: (body: unknown) => Promise<void>; close: () => void }) {
  const start = variant ?? forms.newVariantValues
  const [attributes, setAttributes] = useState<Pair[]>(
    Object.entries(variant?.attributes ?? {}).map(([name, value]) => ({ name, value })),
  )

  return (
    <FieldForm
      title={variant ? `Edit ${variant.variantName}` : 'Add variant'}
      sections={forms.variantSections}
      initial={start}
      submitLabel={variant ? 'Save changes' : 'Add variant'}
      onCancel={close}
      onSubmit={(values) =>
        save({
          ...start,
          ...values,
          attributes: Object.fromEntries(attributes.filter((a) => a.name.trim()).map((a) => [a.name.trim(), a.value])),
        })
      }
    >
      <PairsEditor title="Attributes" pairs={attributes} onChange={setAttributes} namePlaceholder="e.g. Size" valuePlaceholder="e.g. 1.5L" />
    </FieldForm>
  )
}
