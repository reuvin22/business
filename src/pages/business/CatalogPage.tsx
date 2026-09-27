import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createProduct, listProducts } from '../../api/catalog'
import { listCategories, searchBusinesses } from '../../api/directory'
import { brandsApi, customerPricesApi } from '../../api/resources'
import type { Brand, CustomerPrice } from '../../api/types'
import { useBusiness } from '../../businessContext'
import FieldForm from '../../components/FieldForm'
import ResourceSection from '../../components/ResourceSection'
import { Badge, EmptyState, ErrorBox, Loading, PageHeader, Tabs } from '../../components/ui'
import { labelOf } from '../../constants/options'
import * as forms from '../../forms/definitions'
import { useLoad } from '../../hooks/useLoad'
import { useTab } from '../../hooks/useTab'
import { formatDate, formatMoney } from '../../utils/format'
import { categoryName, categoryOptions } from '../../utils/options'
import { formToProduct, newProductValues } from './catalog/productForm'

const TABS = [
  { key: 'products', label: 'Products' },
  { key: 'brands', label: 'Brands' },
  { key: 'customer-prices', label: 'Customer prices' },
]

export default function CatalogPage() {
  const { business, can } = useBusiness()
  const [tab, setTab] = useTab(TABS)

  return (
    <div className="page">
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
            { label: 'Description', render: (b) => <span className="wrap">{b.description || '—'}</span> },
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
  const { data: brands = [] } = useLoad(() => brandsApi.list(business.id), [business.id])
  const { data: categories = [] } = useLoad(listCategories, [])
  const [adding, setAdding] = useState(false)

  const brandOptions = brands.map((b) => ({ value: b.id, label: b.brandName }))
  const canEdit = can('products.manage')

  return (
    <section className="resource-section">
      <div className="section-head">
        <p className="hint">Click a product to manage its images, variants, and price tiers.</p>
        {canEdit && !adding && (
          <button type="button" className="btn btn-primary btn-auto" onClick={() => setAdding(true)}>
            + Add product
          </button>
        )}
      </div>

      {adding && (
        <FieldForm
          title="Add product"
          sections={forms.productSections(brandOptions, categoryOptions(categories))}
          initial={newProductValues}
          submitLabel="Add product"
          onCancel={() => setAdding(false)}
          onSubmit={async (values) => {
            const product = await createProduct(business.id, formToProduct(values, newProductValues))
            navigate(`/business/${business.id}/products/${product.id}?tab=prices`)
          }}
        />
      )}

      <ErrorBox message={error} />
      {loading && !products ? (
        <Loading />
      ) : !products?.length ? (
        !adding && <EmptyState text="No products yet." />
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Unit</th>
                <th className="num">MOQ</th>
                <th>Visibility</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="strong">
                    <Link to={`/business/${business.id}/products/${p.id}`} className="row-link">
                      {p.images[0] && <img src={p.images.find((i) => i.isPrimary)?.imageUrl ?? p.images[0].imageUrl} alt="" className="thumb" />}
                      {p.productName}
                    </Link>
                  </td>
                  <td>{p.sku || '—'}</td>
                  <td>{categoryName(categories, p.categoryId) || '—'}</td>
                  <td>{brands.find((b) => b.id === p.brandId)?.brandName ?? '—'}</td>
                  <td>{p.unit}</td>
                  <td className="num">{p.orderRules.minimumOrderQuantity}</td>
                  <td>{labelOf(p.visibility)}</td>
                  <td>
                    <Badge value={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
        { label: 'Price', className: 'num', render: (c) => formatMoney(c.price, business.currency) },
        { label: 'From qty', className: 'num', render: (c) => c.minimumQuantity },
        {
          label: 'Valid',
          render: (c) =>
            c.effectiveFrom || c.effectiveUntil ? `${formatDate(c.effectiveFrom)} – ${formatDate(c.effectiveUntil)}` : 'Always',
        },
      ]}
    />
  )
}
