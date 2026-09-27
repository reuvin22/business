import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createProduct, listProducts } from '../../api/catalog'
import { listCategories, searchBusinesses } from '../../api/directory'
import { brandsApi, customerPricesApi } from '../../api/resources'
import type { Brand, CustomerPrice, ProductImage } from '../../api/types'
import { useBusiness } from '../../businessContext'
import FieldForm from '../../components/FieldForm'
import { ImagesEditor } from '../../components/ListEditors'
import ResourceSection from '../../components/ResourceSection'
import { Badge, EmptyState, ErrorBox, Loading, PageHeader, ProductThumb, Tabs } from '../../components/ui'
import { labelOf } from '../../constants/options'
import * as forms from '../../forms/definitions'
import { useLoad } from '../../hooks/useLoad'
import { useTab } from '../../hooks/useTab'
import { formatDate, formatMoney } from '../../utils/format'
import { categoryName, categoryOptions } from '../../utils/options'
import { formToProduct, newProductValues } from './catalog/productForm'
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
  const { data: brands = [] } = useLoad(() => brandsApi.list(business.id), [business.id])
  const { data: categories = [] } = useLoad(listCategories, [])
  const [adding, setAdding] = useState(false)
  const [newImages, setNewImages] = useState<ProductImage[]>([])

  const brandOptions = brands.map((b) => ({ value: b.id, label: b.brandName }))
  const canEdit = can('products.manage')

  return (
    <section className={ui.section}>
      <div className={ui.sectionHead}>
        <p className={ui.hint}>Click a product to manage its images, variants, and price tiers.</p>
        {canEdit && !adding && (
          <button
            type="button"
            className={ui.btnPrimary}
            onClick={() => {
              setNewImages([])
              setAdding(true)
            }}
          >
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
            const product = await createProduct(business.id, { ...formToProduct(values, newProductValues), images: newImages })
            navigate(`/business/${business.id}/products/${product.id}?tab=prices`)
          }}
        >
          <ImagesEditor businessId={business.id} images={newImages} onChange={setNewImages} />
        </FieldForm>
      )}

      <ErrorBox message={error} />
      {loading && !products ? (
        <Loading />
      ) : !products?.length ? (
        !adding && <EmptyState text="No products yet." />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>Product</th>
                <th className={ui.th}>SKU</th>
                <th className={ui.th}>Category</th>
                <th className={ui.th}>Brand</th>
                <th className={ui.th}>Unit</th>
                <th className={cx(ui.th, ui.num)}>MOQ</th>
                <th className={ui.th}>Visibility</th>
                <th className={ui.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className={cx(ui.td, ui.strong)}>
                    <Link to={`/business/${business.id}/products/${p.id}`} className={ui.rowLink}>
                      <ProductThumb images={p.images} />
                      {p.productName}
                    </Link>
                  </td>
                  <td className={ui.td}>{p.sku || '—'}</td>
                  <td className={ui.td}>{categoryName(categories, p.categoryId) || '—'}</td>
                  <td className={ui.td}>{brands.find((b) => b.id === p.brandId)?.brandName ?? '—'}</td>
                  <td className={ui.td}>{p.unit}</td>
                  <td className={cx(ui.td, ui.num)}>{p.orderRules.minimumOrderQuantity}</td>
                  <td className={ui.td}>{labelOf(p.visibility)}</td>
                  <td className={ui.td}>
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
