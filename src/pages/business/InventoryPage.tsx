import { useState, type FormEvent } from 'react'
import * as catalog from '../../api/catalog'
import type { InventoryItem } from '../../api/types'
import { useBusiness } from '../../businessContext'
import FieldForm from '../../components/FieldForm'
import { Badge, ConfirmButton, EmptyState, ErrorBox, Loading, PageHeader, Tabs } from '../../components/ui'
import * as forms from '../../forms/definitions'
import { useLoad } from '../../hooks/useLoad'
import { useStockData, type StockData } from '../../hooks/useStockData'
import { useTab } from '../../hooks/useTab'
import { formatDate, formatMoney, formatNumber, todayText } from '../../utils/format'
import { splitStockItem, stockItemName, stockItemOptions } from '../../utils/options'

const TABS = [
  { key: 'stock', label: 'Stock by location' },
  { key: 'sales', label: 'Walk-in sales' },
]

export default function InventoryPage() {
  const { business } = useBusiness()
  const [tab, setTab] = useTab(TABS)
  const stockData = useStockData(business.id)

  return (
    <div className="page">
      <PageHeader title="Inventory" subtitle="Stock per product and location. Orders reserve stock when confirmed and take it out when shipped." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <ErrorBox message={stockData.error} />
      {!stockData.data ? (
        <Loading />
      ) : stockData.data.locations.length === 0 ? (
        <EmptyState text="Add a location first (Profile → Locations & hours). Stock is kept per location." />
      ) : tab === 'stock' ? (
        <StockTab data={stockData.data} />
      ) : (
        <SalesTab data={stockData.data} />
      )}
    </div>
  )
}

function StockTab({ data }: { data: StockData }) {
  const { business, can } = useBusiness()
  const inventory = useLoad(() => catalog.listInventory(business.id), [business.id])
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
      inventory.reload()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  return (
    <section className="resource-section">
      <div className="section-head">
        <p className="hint">Available = on hand − reserved for confirmed orders.</p>
        {canEdit && !adding && (
          <button type="button" className="btn btn-primary btn-auto" onClick={() => setAdding(true)}>
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
            inventory.reload()
          }}
        />
      )}

      {adjusting && (
        <AdjustForm
          item={adjusting}
          name={stockItemName(data.products, data.variantsByProduct, adjusting.productId, adjusting.variantId)}
          onDone={() => {
            setAdjusting(null)
            inventory.reload()
          }}
        />
      )}

      <ErrorBox message={inventory.error || actionError} />
      {!inventory.data ? (
        <Loading />
      ) : inventory.data.length === 0 ? (
        !adding && <EmptyState text="No stock records yet." />
      ) : (
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Location</th>
                <th className="num">On hand</th>
                <th className="num">Reserved</th>
                <th className="num">Available</th>
                <th className="num">Alert at</th>
                <th>Status</th>
                {canEdit && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {inventory.data.map((item) => (
                <tr key={item.id}>
                  <td className="strong">{stockItemName(data.products, data.variantsByProduct, item.productId, item.variantId)}</td>
                  <td>{locationName(item.locationId)}</td>
                  <td className="num">{formatNumber(item.quantity)}</td>
                  <td className="num">{formatNumber(item.reservedQuantity)}</td>
                  <td className="num strong">{formatNumber(item.availableQuantity)}</td>
                  <td className="num">{formatNumber(item.reorderLevel)}</td>
                  <td>
                    <Badge value={item.stockStatus} />
                  </td>
                  {canEdit && (
                    <td className="actions">
                      <button type="button" className="link" onClick={() => setAdjusting(item)}>
                        Adjust
                      </button>
                      <ConfirmButton label="Delete" onConfirm={() => remove(item)} />
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
    <form className="card form-card" onSubmit={handleSubmit}>
      <h2>Adjust stock · {name}</h2>
      <p className="hint">
        On hand: {formatNumber(item.quantity)} · Available: {formatNumber(item.availableQuantity)}
      </p>
      <div className="form-grid three">
        <label>
          Change (+ add / − remove)
          <input type="number" step="any" value={change} onChange={(e) => setChange(e.target.value)} placeholder="e.g. 100 or -3" autoFocus />
        </label>
        <label>
          Reason
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Delivery received" />
        </label>
        <label>
          Low-stock alert at
          <input type="number" step="any" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} />
        </label>
      </div>
      <ErrorBox message={error} />
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary btn-auto">
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

  async function undo(saleId: string) {
    setActionError('')
    try {
      await catalog.deleteSale(business.id, saleId)
      sales.reload()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  return (
    <section className="resource-section">
      <div className="section-head">
        <p className="hint">Over-the-counter sales. Each sale takes stock out of the location it was sold from.</p>
        {canEdit && !adding && (
          <button type="button" className="btn btn-primary btn-auto" onClick={() => setAdding(true)}>
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
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Location</th>
                <th className="num">Qty</th>
                <th className="num">Unit price</th>
                <th className="num">Total</th>
                {canEdit && <th aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {sorted.map((sale) => (
                <tr key={sale.id}>
                  <td>{formatDate(sale.date)}</td>
                  <td className="strong">
                    {sale.productName}
                    {sale.variantName && ` (${sale.variantName})`}
                  </td>
                  <td>{data.locations.find((l) => l.id === sale.locationId)?.locationName ?? '—'}</td>
                  <td className="num">{sale.quantity}</td>
                  <td className="num">{formatMoney(sale.unitPrice, business.currency)}</td>
                  <td className="num strong">{formatMoney(sale.quantity * sale.unitPrice, business.currency)}</td>
                  {canEdit && (
                    <td className="actions">
                      <ConfirmButton label="Undo" confirmLabel="Confirm undo" onConfirm={() => undo(sale.id)} />
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
