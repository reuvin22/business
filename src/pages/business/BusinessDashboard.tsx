import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { listInventory, listProducts, listSales } from '../../api/catalog'
import { listOrders } from '../../api/orders'
import type { Order, Product, Sale } from '../../api/types'
import { useBusiness } from '../../businessContext'
import { AreaChart, ColumnChart, SegmentedToggle, type Point } from '../../components/charts'
import { ExpenseIcon, MarginIcon, RevenueIcon, SalesIcon } from '../../components/icons'
import { ErrorBox, Loading } from '../../components/ui'
import { useLoad } from '../../hooks/useLoad'
import { formatMoney, todayText } from '../../utils/format'

type Period = 'weekly' | 'monthly'
const PERIODS: { value: Period; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
]
const PERIOD_DAYS: Record<Period, number> = { weekly: 7, monthly: 30 }
const KPI_WINDOW = 30

// Orders in these statuses count as sold
const SOLD_STATUSES = ['CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED']

/** One sold line, from a walk-in sale or from an order. */
type Entry = {
  id: string
  createdAt: number
  date: string // YYYY-MM-DD
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  unitCost: number | null
  source: 'Walk-in' | 'Order'
}

function toEntries(sales: Sale[], orders: Order[], products: Product[]): Entry[] {
  const costOf = (productId: string) => products.find((p) => p.id === productId)?.costPrice ?? null
  const fromSales = sales.map((s) => ({ ...s, source: 'Walk-in' as const }))
  const fromOrders = orders
    .filter((o) => SOLD_STATUSES.includes(o.orderStatus))
    .flatMap((o) =>
      o.items.map((item, i) => ({
        id: `${o.id}-${i}`,
        createdAt: o.orderedAt,
        date: todayText(new Date(o.orderedAt)),
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unitCost: costOf(item.productId),
        source: 'Order' as const,
      })),
    )
  return [...fromSales, ...fromOrders]
}

/** The last `n` calendar days ending today (oldest first), optionally shifted back `offset` days. */
function lastDays(n: number, offset = 0) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - offset - (n - 1 - i))
    return d
  })
}

const revenueOf = (e: Entry) => e.quantity * e.unitPrice
const costOf = (e: Entry) => e.quantity * (e.unitCost ?? 0)

function totals(entries: Entry[]) {
  const revenue = entries.reduce((t, e) => t + revenueOf(e), 0)
  const expense = entries.reduce((t, e) => t + costOf(e), 0)
  return { revenue, expense, count: entries.length, margin: revenue > 0 ? ((revenue - expense) / revenue) * 100 : null }
}

const pctChange = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null)

export default function BusinessDashboard() {
  const { business } = useBusiness()
  const base = `/business/${business.id}`
  const currency = business.currency
  const { data, error } = useLoad(
    () =>
      Promise.all([
        listSales(business.id),
        listOrders(business.id, 'selling'),
        listProducts(business.id),
        listInventory(business.id),
      ]).then(([sales, orders, products, inventory]) => ({ sales, orders, products, inventory })),
    [business.id],
  )

  const [barPeriod, setBarPeriod] = useState<Period>('weekly')
  const [linePeriod, setLinePeriod] = useState<Period>('weekly')
  const [popularPeriod, setPopularPeriod] = useState<Period>('weekly')

  if (!data) return <div className="page">{error ? <ErrorBox message={error} /> : <Loading />}</div>

  const entries = toEntries(data.sales, data.orders, data.products)
  const pendingOrders = data.orders.filter((o) => o.orderStatus === 'PENDING').length
  const lowStock = data.inventory.filter((i) => i.stockStatus !== 'IN_STOCK').length
  const money = (n: number, decimals = 0) => formatMoney(n, currency, decimals)

  const inDays = (days: Date[]) => {
    const keys = new Set(days.map((d) => todayText(d)))
    return entries.filter((e) => keys.has(e.date))
  }

  // KPIs: last 30 days vs the 30 days before
  const cur = totals(inDays(lastDays(KPI_WINDOW)))
  const prev = totals(inDays(lastDays(KPI_WINDOW, KPI_WINDOW)))

  const seriesFor = (period: Period, value: (dayEntries: Entry[]) => number): Point[] =>
    lastDays(PERIOD_DAYS[period]).map((d) => ({
      label: period === 'weekly' ? d.toLocaleDateString(undefined, { weekday: 'short' }) : String(d.getDate()),
      tipLabel: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'long' }),
      value: value(entries.filter((e) => e.date === todayText(d))),
    }))

  const unitsPerDay = seriesFor(barPeriod, (es) => es.reduce((t, e) => t + e.quantity, 0))
  const revenuePerDay = seriesFor(linePeriod, (es) => es.reduce((t, e) => t + revenueOf(e), 0))

  // Most popular products in the chosen period
  const popularMap = new Map<string, { name: string; units: number; revenue: number; lastPrice: number }>()
  for (const e of inDays(lastDays(PERIOD_DAYS[popularPeriod]))) {
    const row = popularMap.get(e.productId) ?? { name: e.productName, units: 0, revenue: 0, lastPrice: e.unitPrice }
    row.units += e.quantity
    row.revenue += revenueOf(e)
    popularMap.set(e.productId, row)
  }
  const popular = [...popularMap.entries()]
    .map(([id, row]) => ({ id, ...row }))
    .sort((a, b) => b.units - a.units || b.revenue - a.revenue)
    .slice(0, 5)

  const recent = [...entries].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
  const labelEvery = (p: Period) => (p === 'weekly' ? 1 : 5)

  return (
    <div className="page dash">
      <div className="dash-header">
        <h1>Dashboard</h1>
        <span className="dash-date">{today}</span>
      </div>

      {(pendingOrders > 0 || lowStock > 0) && (
        <div className="attention-row">
          {pendingOrders > 0 && (
            <Link to={`${base}/orders`} className="attention">
              <strong>{pendingOrders}</strong> new order{pendingOrders > 1 && 's'} waiting for you
            </Link>
          )}
          {lowStock > 0 && (
            <Link to={`${base}/inventory`} className="attention warn">
              <strong>{lowStock}</strong> stock record{lowStock > 1 && 's'} low or out of stock
            </Link>
          )}
        </div>
      )}

      {entries.length === 0 && (
        <div className="dash-banner">
          No sales yet. Record walk-in sales on the <Link to={`${base}/inventory?tab=sales`}>Inventory</Link> page, or get
          orders from other businesses by adding public products with prices on the <Link to={`${base}/products`}>Products</Link> page.
        </div>
      )}

      <div className="kpi-grid">
        <Kpi title="Total Revenue" icon={<RevenueIcon />} value={money(cur.revenue)} delta={pctChange(cur.revenue, prev.revenue)} />
        <Kpi
          title="Cost of Goods"
          icon={<ExpenseIcon />}
          value={money(cur.expense)}
          delta={pctChange(cur.expense, prev.expense)}
          upIsGood={false}
        />
        <Kpi title="Items Sold (lines)" icon={<SalesIcon />} value={cur.count.toLocaleString()} delta={pctChange(cur.count, prev.count)} />
        <Kpi
          title="Profit Margin"
          icon={<MarginIcon />}
          value={cur.margin === null ? '—' : `${cur.margin.toFixed(0)} %`}
          delta={cur.margin !== null && prev.margin !== null ? cur.margin - prev.margin : null}
          unit="pts"
        />
      </div>

      <div className="dash-grid">
        <div className="dash-col">
          <section className="panel">
            <div className="panel-head">
              <h2>Recent Sales</h2>
              <Link to={`${base}/orders`} className="panel-link">
                View orders
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="panel-empty">No sales yet.</p>
            ) : (
              <ul className="recent-sales">
                {recent.map((e) => (
                  <li key={e.id}>
                    <span className="item-avatar">{e.productName.charAt(0).toUpperCase()}</span>
                    <span className="rs-name">{e.productName}</span>
                    <span className="rs-muted">{new Date(`${e.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span className="rs-muted">{e.quantity} pcs</span>
                    <span className="rs-status">{e.source}</span>
                    <span className="rs-total">{money(revenueOf(e), 2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Units Sold Per Day</h2>
              <SegmentedToggle options={PERIODS} value={barPeriod} onChange={setBarPeriod} />
            </div>
            <ColumnChart data={unitsPerDay} height={300} labelEvery={labelEvery(barPeriod)} format={(n) => `${n} units`} />
          </section>
        </div>

        <div className="dash-col">
          <section className="panel">
            <div className="panel-head">
              <h2>Revenue ({currency})</h2>
              <SegmentedToggle options={PERIODS} value={linePeriod} onChange={setLinePeriod} />
            </div>
            <AreaChart data={revenuePerDay} height={300} labelEvery={labelEvery(linePeriod)} format={(n) => money(n, 2)} />
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Most Popular Products</h2>
              <SegmentedToggle options={PERIODS} value={popularPeriod} onChange={setPopularPeriod} />
            </div>
            {popular.length === 0 ? (
              <p className="panel-empty">No sales in this period.</p>
            ) : (
              <table className="popular">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th className="num">Price</th>
                    <th className="num">Sold</th>
                    <th className="num">Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {popular.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <span className="pop-name">
                          <span className="item-avatar">{p.name.charAt(0).toUpperCase()}</span>
                          <span className="ellipsis">{p.name}</span>
                        </span>
                      </td>
                      <td className="num muted">{money(p.lastPrice, 2)}</td>
                      <td className="num muted">{p.units}</td>
                      <td className="num">{money(p.revenue, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function Kpi({
  title,
  icon,
  value,
  delta,
  upIsGood = true,
  unit = '%',
}: {
  title: string
  icon: ReactNode
  value: string
  delta: number | null
  upIsGood?: boolean
  unit?: '%' | 'pts'
}) {
  const good = delta !== null && delta >= 0 === upIsGood
  return (
    <div className="kpi">
      <div className="kpi-top">
        <span className="kpi-title">{title}</span>
        <span className="kpi-icon">{icon}</span>
      </div>
      <div className="kpi-bottom">
        <span className="kpi-value">{value}</span>
        {delta !== null && (
          <span className={`kpi-delta ${good ? 'up' : 'down'}`} title="Compared with the previous 30 days">
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(2)}
            {unit === '%' ? '%' : ' pts'}
          </span>
        )}
      </div>
      <span className="kpi-caption">Last 30 days</span>
    </div>
  )
}
