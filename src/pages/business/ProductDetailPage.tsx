import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as catalog from '../../api/catalog'
import { listCategories } from '../../api/directory'
import { brandsApi, locationsApi } from '../../api/resources'
import { useBusiness } from '../../businessContext'
import DetailsView, { DetailItem, DetailsCard } from '../../components/DetailsView'
import ProductGallery from '../../components/ProductGallery'
import StockHistoryTable from '../../components/StockHistoryTable'
import { Badge, ConfirmButton, EmptyState, ErrorBox, Loading, PageHeader, Table, Td, Th } from '../../components/ui'
import { labelOf } from '../../constants/options'
import { productSections } from '../../forms/definitions'
import { useLoad } from '../../hooks/useLoad'
import { cx, ui } from '../../styles'
import { formatDate, formatMoney, formatNumber } from '../../utils/format'
import { categoryOptions } from '../../utils/options'
import ProductForm from './catalog/ProductForm'
import { productToForm } from './catalog/productValues'

const HISTORY_ON_PAGE = 15

/** Everything about one product: details, variants, prices, stock, and recent stock changes. */
export default function ProductDetailPage() {
  const { business, can } = useBusiness()
  const { productId = '' } = useParams()
  const navigate = useNavigate()
  const full = useLoad(() => catalog.getProductFull(business.id, productId), [business.id, productId])
  const updatedAt = full.data?.product.updatedAt
  const { data: stock = [] } = useLoad(() => catalog.listInventory(business.id), [business.id, updatedAt])
  const { data: history = [] } = useLoad(
    () => catalog.listStockMovements(business.id, { product_id: productId }),
    [business.id, productId, updatedAt],
  )
  const { data: locations = [] } = useLoad(() => locationsApi.list(business.id), [business.id])
  const { data: brands = [] } = useLoad(() => brandsApi.list(business.id), [business.id])
  const { data: categories = [] } = useLoad(listCategories, [])
  const [editing, setEditing] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const canEdit = can('products.manage')
  const base = `/business/${business.id}`
  const backLink = (
    <Link to={`${base}/products`} className={ui.backLink}>
      ← All products
    </Link>
  )

  if (!full.data) {
    return (
      <div className={ui.page}>
        {backLink}
        {full.error ? <ErrorBox message={full.error} /> : <Loading />}
      </div>
    )
  }

  const { product, variants, prices } = full.data
  const money = (n: number) => formatMoney(n, business.currency)
  const variantName = (id: string | null) =>
    id ? (variants.find((v) => v.id === id)?.variantName ?? 'Removed variant') : 'All variants'
  const locationName = (id: string) => locations.find((l) => l.id === id)?.locationName ?? '—'
  const productStock = stock.filter((s) => s.productId === product.id)
  const sections = productSections(
    brands.map((b) => ({ value: b.id, label: b.brandName })),
    categoryOptions(categories),
  )

  if (editing) {
    return (
      <div className={ui.page}>
        {backLink}
        <ProductForm
          key={product.updatedAt}
          businessId={business.id}
          currency={business.currency}
          existing={full.data}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            full.reload()
          }}
        />
      </div>
    )
  }

  return (
    <div className={ui.page}>
      {backLink}
      <PageHeader
        title={product.productName}
        subtitle={`${labelOf(product.visibility)} · sold per ${product.unit}`}
        actions={
          <>
            <Badge value={product.status} />
            {canEdit && (
              <button type="button" className={ui.btnPrimary} onClick={() => setEditing(true)}>
                Edit product
              </button>
            )}
          </>
        }
      />

      <div className="flex flex-col items-start gap-5 lg:flex-row">
        <ProductGallery key={product.updatedAt} images={product.images} />
        <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
          <DetailsView sections={sections} values={productToForm(product)} />
          {product.specifications.length > 0 && (
            <DetailsCard title="Specifications">
              {product.specifications.map((spec) => (
                <DetailItem key={spec.name} label={spec.name}>
                  {spec.value}
                </DetailItem>
              ))}
            </DetailsCard>
          )}
        </div>
      </div>

      <section className={ui.section}>
        <h2 className={ui.h2}>Selling prices</h2>
        {prices.length === 0 ? (
          <EmptyState text="No prices yet. Buyers cannot order this product until it has one." />
        ) : (
          <Table
            head={
              <>
                <Th num>Price</Th>
                <Th>Quantity</Th>
                <Th>Variant</Th>
                <Th>For</Th>
                <Th>Type</Th>
                <Th>Valid</Th>
                <Th>Status</Th>
              </>
            }
          >
            {prices.map((p) => (
              <tr key={p.id}>
                <Td num strong>
                  {money(p.price)}
                </Td>
                <Td>{`${p.minimumQuantity}${p.maximumQuantity ? `–${p.maximumQuantity}` : '+'} ${product.unit}`}</Td>
                <Td>{variantName(p.variantId)}</Td>
                <Td>{p.customerType ? labelOf(p.customerType) : 'Everyone'}</Td>
                <Td>{labelOf(p.priceType)}</Td>
                <Td>
                  {p.effectiveFrom || p.effectiveUntil ? `${formatDate(p.effectiveFrom)} – ${formatDate(p.effectiveUntil)}` : 'Always'}
                </Td>
                <Td>
                  <Badge value={p.status} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      {variants.length > 0 && (
        <section className={ui.section}>
          <h2 className={ui.h2}>Variants</h2>
          <Table
            head={
              <>
                <Th>Variant</Th>
                <Th>SKU</Th>
                <Th>Unit</Th>
                <Th>Attributes</Th>
                <Th num>Weight</Th>
                <Th>Status</Th>
              </>
            }
          >
            {variants.map((v) => (
              <tr key={v.id}>
                <Td strong>{v.variantName}</Td>
                <Td>{v.sku || '—'}</Td>
                <Td>{v.unit || product.unit}</Td>
                <Td wrap>
                  {Object.entries(v.attributes)
                    .map(([k, val]) => `${k}: ${val}`)
                    .join(', ') || '—'}
                </Td>
                <Td num>{v.weightKg ? `${formatNumber(v.weightKg)} kg` : '—'}</Td>
                <Td>
                  <Badge value={v.status} />
                </Td>
              </tr>
            ))}
          </Table>
        </section>
      )}

      <section className={ui.section}>
        <div className={ui.sectionHead}>
          <h2 className={ui.h2}>Stock</h2>
          <Link to={`${base}/inventory`} className={ui.btnGhost}>
            Manage stock
          </Link>
        </div>
        {productStock.length === 0 ? (
          <EmptyState text="No stock recorded yet. Add it on the Inventory page." />
        ) : (
          <Table
            head={
              <>
                <Th>Variant</Th>
                <Th>Location</Th>
                <Th num>On hand</Th>
                <Th num>Reserved</Th>
                <Th num>Available</Th>
                <Th>Status</Th>
              </>
            }
          >
            {productStock.map((s) => (
              <tr key={s.id}>
                <Td strong>{s.variantId ? variantName(s.variantId) : '—'}</Td>
                <Td>{locationName(s.locationId)}</Td>
                <Td num>{formatNumber(s.quantity)}</Td>
                <Td num>{formatNumber(s.reservedQuantity)}</Td>
                <Td num strong>
                  {formatNumber(s.availableQuantity)}
                </Td>
                <Td>
                  <Badge value={s.stockStatus} />
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <section className={ui.section}>
        <div className={ui.sectionHead}>
          <h2 className={ui.h2}>Stock history</h2>
          {history.length > HISTORY_ON_PAGE && (
            <Link to={`${base}/inventory?tab=history&product=${product.id}`} className={ui.btnGhost}>
              See all {history.length}
            </Link>
          )}
        </div>
        <StockHistoryTable movements={history.slice(0, HISTORY_ON_PAGE)} showProduct={false} />
      </section>

      {canEdit && (
        <section className={cx(ui.dangerZone, 'mt-4')}>
          <h3 className={ui.dangerTitle}>Delete product</h3>
          <ErrorBox message={deleteError} />
          <div className={ui.formActions}>
            <span className={ui.confirmText}>Also deletes its variants, prices, and stock records. Past orders keep their copy.</span>
            <ConfirmButton
              label="Delete product"
              confirmLabel="Yes, delete"
              onConfirm={async () => {
                try {
                  await catalog.deleteProduct(business.id, productId)
                  navigate(`${base}/products`, { replace: true })
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
