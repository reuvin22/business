import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as catalog from '../../api/catalog'
import type { InventoryItem } from '../../api/types'
import { useBusiness } from '../../businessContext'
import FieldForm from '../../components/FieldForm'
import StockHistoryTable from '../../components/StockHistoryTable'
import { Badge, ConfirmButton, EmptyState, ErrorBox, LiveBadge, Loading, PageHeader, Tabs } from '../../components/ui'
import * as forms from '../../forms/definitions'
import { useLoad } from '../../hooks/useLoad'
import { useLiveInventory } from '../../hooks/useLiveInventory'
import { useStockData, type StockData } from '../../hooks/useStockData'
import { useTab } from '../../hooks/useTab'
import { formatDate, formatMoney, formatNumber, todayText } from '../../utils/format'
import { splitStockItem, stockItemName, stockItemOptions } from '../../utils/options'
import { cx, ui } from '../../styles'

const TABS = [
  { key: 'stock', label: 'Stock by location' },
  { key: 'history', label: 'Stock history' },
  { key: 'sales', label: 'Walk-in sales' },
]

export default function InventoryPage() {
  const { business } = useBusiness()
  const [tab, setTab] = useTab(TABS)
  const stockData = useStockData(business.id)

  return (
    <div className={ui.page}>
      <PageHeader title="Inventory" subtitle="Stock per product and location. Orders reserve stock when confirmed and take it out when shipped." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <ErrorBox message={stockData.error} />
      {!stockData.data ? (
        <Loading />
      ) : stockData.data.locations.length === 0 ? (
        <EmptyState text="Add a location first (Profile → Locations & hours). Stock is kept per location." />
      ) : tab === 'stock' ? (
        <StockTab data={stockData.data} />
      ) : tab === 'history' ? (
        <HistoryTab data={stockData.data} />
      ) : (
        <SalesTab data={stockData.data} />
      )}
    </div>
  )
}

function StockTab({ data }: { data: StockData }) {
  const { business, can } = useBusiness()
  // Updates by itself when stock changes anywhere (e.g. a sale in the selling app)
  const inventory = useLiveInventory(business.id)
  const [adding, setAdding] = useState(false)
  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null)
  const [actionError, setActionError] = useState('')
  const canEdit = can('inventory.manage')

  const itemOptions = stockItemOptions(data.products, data.variantsByProduct)
  const locationOptions = data.locations.map((l) => ({ value: l.id, label: l.locationName }))
  const locationName = (id: string) => data.locations.find((l) => l.id === id)?.locationName ?? '?'

  async function remove(item: InventoryItem) {
    setActionError('')
    try {
      await catalog.deleteInventory(business.id, item.id)
      inventory.refresh()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  return (
    <section className={ui.section}>
      <div className={ui.sectionHead}>
        <p className={ui.hint}>
          Available = on hand − reserved for confirmed orders.{' '}
          {inventory.live && <LiveBadge />}
        </p>
        {canEdit && !adding && (
          <button type="button" className={ui.btnPrimary} onClick={() => setAdding(true)}>
            + Add stock record
          </button>
        )}
      </div>

      {adding && (
        <FieldForm
          title="Add stock record"
          sections={forms.inventorySections(itemOptions, locationOptions)}
          initial={{ locationId: data.locations.find((l) => l.isPrimary)?.id ?? '' }}
          submitLabel="Add"
          onCancel={() => setAdding(false)}
          onSubmit={async ({ stockItem, ...values }) => {
            await catalog.createInventory(business.id, { ...values, ...splitStockItem(stockItem) })
            setAdding(false)
            inventory.refresh()
          }}
        />
      )}

      {adjusting && (
        <AdjustForm
          item={adjusting}
          name={stockItemName(data.products, data.variantsByProduct, adjusting.productId, adjusting.variantId)}
          onDone={() => {
            setAdjusting(null)
            inventory.refresh()
          }}
        />
      )}

      <ErrorBox message={inventory.error || actionError} />
      {!inventory.data ? (
        <Loading />
      ) : inventory.data.length === 0 ? (
        !adding && <EmptyState text="No stock records yet." />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>Product</th>
                <th className={ui.th}>Location</th>
                <th className={cx(ui.th, ui.num)}>On hand</th>
                <th className={cx(ui.th, ui.num)}>Reserved</th>
                <th className={cx(ui.th, ui.num)}>Available</th>
                <th className={cx(ui.th, ui.num)}>Alert at</th>
                <th className={ui.th}>Status</th>
                <th className={ui.th} aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {inventory.data.map((item) => (
                <tr key={item.id}>
                  <td className={cx(ui.td, ui.strong)}>{stockItemName(data.products, data.variantsByProduct, item.productId, item.variantId)}</td>
                  <td className={ui.td}>{locationName(item.locationId)}</td>
                  <td className={cx(ui.td, ui.num)}>{formatNumber(item.quantity)}</td>
                  <td className={cx(ui.td, ui.num)}>{formatNumber(item.reservedQuantity)}</td>
                  <td className={cx(ui.td, ui.num, ui.strong)}>{formatNumber(item.availableQuantity)}</td>
                  <td className={cx(ui.td, ui.num)}>{formatNumber(item.reorderLevel)}</td>
                  <td className={ui.td}>
                    <Badge value={item.stockStatus} />
                  </td>
                  <td className={cx(ui.td, ui.actions)}>
                    <Link to={`?tab=history&product=${item.productId}`} className={ui.link}>
                      History
                    </Link>
                    {canEdit && (
                      <>
                        <button type="button" className={ui.link} onClick={() => setAdjusting(item)}>
                          Adjust
                        </button>
                        <ConfirmButton label="Delete" onConfirm={() => remove(item)} />
                      </>
                    )}
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

/** Add or remove stock (e.g. +100 delivery received, −3 damaged), or change the low-stock alert. */
function AdjustForm({ item, name, onDone }: { item: InventoryItem; name: string; onDone: () => void }) {
  const { business } = useBusiness()
  const [change, setChange] = useState('')
  const [note, setNote] = useState('')
  const [reorderLevel, setReorderLevel] = useState(item.reorderLevel === null ? '' : String(item.reorderLevel))
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    try {
      const amount = Number(change)
      if (change.trim() && amount !== 0) await catalog.adjustInventory(business.id, item.id, { change: amount, note })
      const newLevel = reorderLevel.trim() === '' ? null : Number(reorderLevel)
      if (newLevel !== item.reorderLevel) {
        const quantity = item.quantity + (change.trim() ? amount : 0)
        await catalog.updateInventory(business.id, item.id, { quantity, reorderLevel: newLevel })
      }
      onDone()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form className={ui.formCard} onSubmit={handleSubmit}>
      <h2 className={ui.h2}>Adjust stock · {name}</h2>
      <p className={ui.hint}>
        On hand: {formatNumber(item.quantity)} · Available: {formatNumber(item.availableQuantity)}
      </p>
      <div className={ui.formGrid3}>
        <label className={ui.label}>
          Change (+ add / − remove)
          <input className={ui.input} type="number" step="any" value={change} onChange={(e) => setChange(e.target.value)} placeholder="e.g. 100 or -3" autoFocus />
        </label>
        <label className={ui.label}>
          Reason
          <input className={ui.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Delivery received" />
        </label>
        <label className={ui.label}>
          Low-stock alert at
          <input className={ui.input} type="number" step="any" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
        </label>
      </div>
      <ErrorBox message={error} />
      <div className={ui.formActions}>
        <button type="button" className={ui.btnGhost} onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className={ui.btnPrimary}>
          Save
        </button>
      </div>
    </form>
  )
}

function SalesTab({ data }: { data: StockData }) {
  const { business, can } = useBusiness()
  const sales = useLoad(() => catalog.listSales(business.id), [business.id])
  const [adding, setAdding] = useState(false)
  const [actionError, setActionError] = useState('')
  const canEdit = can('inventory.manage')

  const itemOptions = stockItemOptions(data.products, data.variantsByProduct)
  const locationOptions = data.locations.map((l) => ({ value: l.id, label: l.locationName }))
  const sorted = [...(sales.data ?? [])].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)

  async function remove(saleId: string) {
    setActionError('')
    try {
      await catalog.deleteSale(business.id, saleId)
      sales.reload()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  return (
    <section className={ui.section}>
      <div className={ui.sectionHead}>
        <p className={ui.hint}>Over-the-counter sales, including those from the selling app. Deleting a sale removes it and puts its stock back; a selling-app sale deletes its whole receipt.</p>
        {canEdit && !adding && (
          <button type="button" className={ui.btnPrimary} onClick={() => setAdding(true)}>
            + Record sale
          </button>
        )}
      </div>

      {adding && (
        <FieldForm
          title="Record walk-in sale"
          sections={forms.saleSections(itemOptions, locationOptions)}
          initial={{ quantity: 1, date: todayText(), locationId: data.locations.find((l) => l.isPrimary)?.id ?? '' }}
          submitLabel="Record sale"
          onCancel={() => setAdding(false)}
          onSubmit={async ({ stockItem, ...values }) => {
            await catalog.recordSale(business.id, { ...values, ...splitStockItem(stockItem) })
            setAdding(false)
            sales.reload()
          }}
        />
      )}

      <ErrorBox message={sales.error || actionError} />
      {!sales.data ? (
        <Loading />
      ) : sorted.length === 0 ? (
        !adding && <EmptyState text="No walk-in sales yet." />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>Date</th>
                <th className={ui.th}>Product</th>
                <th className={ui.th}>Location</th>
                <th className={ui.th}>Receipt</th>
                <th className={cx(ui.th, ui.num)}>Qty</th>
                <th className={cx(ui.th, ui.num)}>Unit price</th>
                <th className={cx(ui.th, ui.num)}>Total</th>
                {canEdit && <th className={ui.th} aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((sale) => (
                <tr key={sale.id}>
                  <td className={ui.td}>{formatDate(sale.date)}</td>
                  <td className={cx(ui.td, ui.strong)}>
                    {sale.productName}
                    {sale.variantName && ` (${sale.variantName})`}
                  </td>
                  <td className={ui.td}>{data.locations.find((l) => l.id === sale.locationId)?.locationName ?? '—'}</td>
                  <td className={ui.td}>{sale.receiptNumber || '—'}</td>
                  <td className={cx(ui.td, ui.num)}>{sale.quantity}</td>
                  <td className={cx(ui.td, ui.num)}>{formatMoney(sale.unitPrice, business.currency)}</td>
                  <td className={cx(ui.td, ui.num, ui.strong)}>{formatMoney(sale.quantity * sale.unitPrice, business.currency)}</td>
                  {canEdit && (
                    <td className={cx(ui.td, ui.actions)}>
                      <ConfirmButton
                        label="Delete"
                        // A selling-app sale is one line of a receipt: the whole receipt goes
                        confirmLabel={sale.receiptId ? `Delete receipt ${sale.receiptNumber}` : 'Yes, delete'}
                        onConfirm={() => remove(sale.id)}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}


/** Every added and deducted quantity, with filters for product and location. */
function HistoryTab({ data }: { data: StockData }) {
  const { business } = useBusiness()
  const [params, setParams] = useSearchParams()
  const productId = params.get('product') ?? ''
  const locationId = params.get('location') ?? ''
  const { data: movements, error } = useLoad(
    () => catalog.listStockMovements(business.id, { product_id: productId || undefined, location_id: locationId || undefined }),
    [business.id, productId, locationId],
  )

  // Keep the filters in the URL, so "History" links and the back button work
  const setFilter = (key: 'product' | 'location', value: string) =>
    setParams((current) => {
      const next = new URLSearchParams(current)
      if (value) next.set(key, value)
      else next.delete(key)
      return next
    })

  return (
    <section className={ui.section}>
      <div className="flex flex-wrap items-center gap-2.5">
        <select className={ui.inputAuto} value={productId} onChange={(e) => setFilter('product', e.target.value)} aria-label="Product">
          <option value="">All products</option>
          {data.products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.productName}
            </option>
          ))}
        </select>
        <select className={ui.inputAuto} value={locationId} onChange={(e) => setFilter('location', e.target.value)} aria-label="Location">
          <option value="">All locations</option>
          {data.locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.locationName}
            </option>
          ))}
        </select>
        <span className={ui.hint}>Newest first. + is stock added, − is stock taken out.</span>
      </div>
      <ErrorBox message={error} />
      {!movements ? <Loading /> : <StockHistoryTable movements={movements} />}
    </section>
  )
}
