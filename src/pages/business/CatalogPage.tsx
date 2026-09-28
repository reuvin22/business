import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listAllPrices, listProducts } from '../../api/catalog'
import { listCategories, searchBusinesses } from '../../api/directory'
import { brandsApi, customerPricesApi } from '../../api/resources'
import type { Brand, CustomerPrice } from '../../api/types'
import { useBusiness } from '../../businessContext'
import ResourceSection from '../../components/ResourceSection'
import { Badge, EmptyState, ErrorBox, Loading, PageHeader, ProductThumb, Table, Tabs, Td, Th } from '../../components/ui'
import { labelOf } from '../../constants/options'
import * as forms from '../../forms/definitions'
import { useLoad } from '../../hooks/useLoad'
import { useTab } from '../../hooks/useTab'
import { formatDate, formatMoney } from '../../utils/format'
import { unitProfit } from '../../utils/profit'
import { categoryName } from '../../utils/options'
import ProductForm from './catalog/ProductForm'
import { cx, ui } from '../../styles'

const TABS = [
  { key: 'products', label: 'Products' },
  { key: 'brands', label: 'Brands' },
  { key: 'customer-prices', label: 'Customer prices' },
]

export default function CatalogPage() {
  const { business, can } = useBusiness()
  const [tab, setTab] = useTab(TABS)

  return (
    <div className={ui.page}>
      <PageHeader title="Products" subtitle={`Everything ${business.businessName} sells.`} />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'products' && <ProductsTab />}
      {tab === 'brands' && (
        <ResourceSection<Brand>
          title="Brands"
          description="Brands your business owns. Products can be linked to a brand."
          businessId={business.id}
          resource={brandsApi}
          sections={forms.brandSections}
          newValues={forms.newBrandValues}
          canEdit={can('products.manage')}
          addLabel="+ Add brand"
          columns={[
            { label: 'Brand', render: (b) => <strong>{b.brandName}</strong> },
            { label: 'Description', render: (b) => <span className="block max-w-90 whitespace-normal">{b.description || '—'}</span> },
            { label: 'Status', render: (b) => <Badge value={b.status} /> },
          ]}
        />
      )}
      {tab === 'customer-prices' && <CustomerPricesTab />}
    </div>
  )
}

function ProductsTab() {
  const { business, can } = useBusiness()
  const navigate = useNavigate()
  const { data: products, loading, error } = useLoad(() => listProducts(business.id), [business.id])
  const { data: prices = [] } = useLoad(() => listAllPrices(business.id), [business.id])
  const { data: brands = [] } = useLoad(() => brandsApi.list(business.id), [business.id])
  const { data: categories = [] } = useLoad(listCategories, [])
  const [adding, setAdding] = useState(false)
  const canEdit = can('products.manage')

  /** The lowest active price for buying one unit, or null when there is none. */
  function startingPrice(productId: string) {
    const amounts = prices
      .filter((price) => price.productId === productId && price.status === 'ACTIVE' && price.minimumQuantity <= 1)
      .map((price) => price.price)
    return amounts.length ? Math.min(...amounts) : null
  }
  const money = (n: number | null | undefined) => (n === null || n === undefined ? '—' : formatMoney(n, business.currency))

  return (
    <section className={ui.section}>
      <div className={ui.sectionHead}>
        <p className={ui.hint}>
          Click a product to see its variants, prices, and stock. Profit / unit = selling price for one − cost price.
        </p>
        {canEdit && !adding && (
          <button type="button" className={ui.btnPrimary} onClick={() => setAdding(true)}>
            + Add product
          </button>
        )}
      </div>

      {adding && (
        <ProductForm
          businessId={business.id}
          currency={business.currency}
          existing={null}
          onCancel={() => setAdding(false)}
          onSaved={(saved) => navigate(`/business/${business.id}/products/${saved.product.id}`)}
        />
      )}

      <ErrorBox message={error} />
      {loading && !products ? (
        <Loading />
      ) : !products?.length ? (
        !adding && <EmptyState text="No products yet." />
      ) : (
        <Table
          head={
            <>
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th num>Price</Th>
              <Th num>Cost</Th>
              <Th num>Profit / unit</Th>
              <Th>Category</Th>
              <Th>Brand</Th>
              <Th>Unit</Th>
              <Th num>MOQ</Th>
              <Th>Visibility</Th>
              <Th>Status</Th>
            </>
          }
        >
          {products.map((p) => {
            const price = startingPrice(p.id)
            const earned = unitProfit(price, p.costPrice)
            return (
            <tr key={p.id}>
              <Td strong>
                <Link to={`/business/${business.id}/products/${p.id}`} className={ui.rowLink}>
                  <ProductThumb images={p.images} />
                  {p.productName}
                </Link>
              </Td>
              <Td>{p.sku || '—'}</Td>
              <Td num strong>
                {money(price)}
              </Td>
              <Td num>{money(p.costPrice)}</Td>
              <Td num>
                {earned ? (
                  <>
                    <span className={cx('font-semibold', earned.profit < 0 ? 'text-down' : 'text-up')}>{money(earned.profit)}</span>
                    {earned.margin !== null && <div className="text-[0.78rem] text-muted">{earned.margin.toFixed(0)}% margin</div>}
                  </>
                ) : (
                  <span className="text-muted" title={price === null ? 'No selling price yet' : 'Set a cost price on the product'}>
                    —
                  </span>
                )}
              </Td>
              <Td>{categoryName(categories, p.categoryId) || '—'}</Td>
              <Td>{brands.find((b) => b.id === p.brandId)?.brandName ?? '—'}</Td>
              <Td>{p.unit}</Td>
              <Td num>{p.orderRules.minimumOrderQuantity}</Td>
              <Td>{labelOf(p.visibility)}</Td>
              <Td>
                <Badge value={p.status} />
              </Td>
            </tr>
            )
          })}
        </Table>
      )}
    </section>
  )
}

function CustomerPricesTab() {
  const { business, can } = useBusiness()
  const { data: products = [] } = useLoad(() => listProducts(business.id), [business.id])
  const { data: businesses = [] } = useLoad(() => searchBusinesses({}), [])

  const customerOptions = businesses
    .filter((b) => b.id !== business.id)
    .map((b) => ({ value: b.id, label: b.businessName }))
  const productOptions = products.map((p) => ({ value: p.id, label: p.productName }))

  return (
    <ResourceSection<CustomerPrice>
      title="Customer prices"
      description="Private prices for specific customers, e.g. Retailer A pays 95 instead of 100. Only you and that customer see them."
      businessId={business.id}
      resource={customerPricesApi}
      sections={forms.customerPriceSections(customerOptions, productOptions)}
      newValues={forms.newCustomerPriceValues}
      canEdit={can('products.manage')}
      addLabel="+ Add customer price"
      columns={[
        { label: 'Customer', render: (c) => <strong>{c.customerBusinessName}</strong> },
        { label: 'Product', render: (c) => products.find((p) => p.id === c.productId)?.productName ?? 'Deleted product' },
        { label: 'Price', num: true, render: (c) => formatMoney(c.price, business.currency) },
        { label: 'From qty', num: true, render: (c) => c.minimumQuantity },
        {
          label: 'Valid',
          render: (c) =>
            c.effectiveFrom || c.effectiveUntil ? `${formatDate(c.effectiveFrom)} – ${formatDate(c.effectiveUntil)}` : 'Always',
        },
      ]}
    />
  )
}
