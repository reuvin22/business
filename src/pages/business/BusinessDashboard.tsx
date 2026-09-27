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
import { cx, ui } from '../../styles'

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

  if (!data) return <div className={ui.page}>{error ? <ErrorBox message={error} /> : <Loading />}</div>

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
    <div className={ui.page}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={cx(ui.h1, 'mb-0 text-[1.75rem]')}>Dashboard</h1>
        <span className="text-[0.85rem] text-muted">{today}</span>
      </div>

      {(pendingOrders > 0 || lowStock > 0) && (
        <div className="flex flex-wrap gap-3">
          {pendingOrders > 0 && (
            <Link to={`${base}/orders`} className="rounded-lg bg-info-soft px-4 py-3 text-[0.9rem] text-info no-underline hover:underline">
              <strong>{pendingOrders}</strong> new order{pendingOrders > 1 && 's'} waiting for you
            </Link>
          )}
          {lowStock > 0 && (
            <Link to={`${base}/inventory`} className="rounded-lg bg-warn-soft px-4 py-3 text-[0.9rem] text-warn no-underline hover:underline">
              <strong>{lowStock}</strong> stock record{lowStock > 1 && 's'} low or out of stock
            </Link>
          )}
        </div>
      )}

      {entries.length === 0 && (
        <div className="rounded-lg border border-dashed border-line bg-surface px-4 py-3 text-[0.9rem] [&_a]:font-bold [&_a]:text-accent">
          No sales yet. Record walk-in sales on the <Link to={`${base}/inventory?tab=sales`}>Inventory</Link> page, or get
          orders from other businesses by adding public products with prices on the <Link to={`${base}/products`}>Products</Link> page.
        </div>
      )}

      <div className="grid grid-cols-4 gap-4.5 max-xl:grid-cols-2 max-sm:grid-cols-1">
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

      <div className="grid grid-cols-2 items-start gap-4.5 max-lg:grid-cols-1">
        <div className="flex min-w-0 flex-col gap-4.5">
          <section className={PANEL}>
            <div className={PANEL_HEAD}>
              <h2 className={ui.h2}>Recent Sales</h2>
              <Link to={`${base}/orders`} className="text-[0.9rem] font-medium text-heading no-underline hover:underline">
                View orders
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="py-6 text-center text-[0.9rem] text-muted">No sales yet.</p>
            ) : (
              <ul className="flex flex-col">
                {recent.map((e) => (
                  <li key={e.id} className="grid grid-cols-[30px_minmax(0,1.6fr)_auto_auto_auto_auto] items-center gap-3.5 py-2.75 text-[0.92rem] max-sm:grid-cols-[30px_minmax(0,1fr)_auto]">
                    <span className={ui.avatar}>{e.productName.charAt(0).toUpperCase()}</span>
                    <span className="truncate font-medium text-heading">{e.productName}</span>
                    <span className="whitespace-nowrap text-muted tabular-nums max-sm:hidden">{new Date(`${e.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span className="whitespace-nowrap text-muted tabular-nums max-sm:hidden">{e.quantity} pcs</span>
                    <span className="font-medium text-up max-sm:hidden">{e.source}</span>
                    <span className="text-right font-semibold whitespace-nowrap text-heading tabular-nums">{money(revenueOf(e), 2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={PANEL}>
            <div className={PANEL_HEAD}>
              <h2 className={ui.h2}>Units Sold Per Day</h2>
              <SegmentedToggle options={PERIODS} value={barPeriod} onChange={setBarPeriod} />
            </div>
            <ColumnChart data={unitsPerDay} height={300} labelEvery={labelEvery(barPeriod)} format={(n) => `${n} units`} />
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-4.5">
          <section className={PANEL}>
            <div className={PANEL_HEAD}>
              <h2 className={ui.h2}>Revenue ({currency})</h2>
              <SegmentedToggle options={PERIODS} value={linePeriod} onChange={setLinePeriod} />
            </div>
            <AreaChart data={revenuePerDay} height={300} labelEvery={labelEvery(linePeriod)} format={(n) => money(n, 2)} />
          </section>

          <section className={PANEL}>
            <div className={PANEL_HEAD}>
              <h2 className={ui.h2}>Most Popular Products</h2>
              <SegmentedToggle options={PERIODS} value={popularPeriod} onChange={setPopularPeriod} />
            </div>
            {popular.length === 0 ? (
              <p className="py-6 text-center text-[0.9rem] text-muted">No sales in this period.</p>
            ) : (
              <table className="w-full table-fixed border-collapse text-[0.92rem]">
                <thead>
                  <tr>
                    <th className={cx(POP_TH, 'w-1/2 max-sm:w-auto')}>Product Name</th>
                    <th className={cx(POP_TH, ui.num, 'max-sm:hidden')}>Price</th>
                    <th className={cx(POP_TH, ui.num)}>Sold</th>
                    <th className={cx(POP_TH, ui.num)}>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {popular.map((p) => (
                    <tr key={p.id}>
                      <td className={POP_TD}>
                        <span className="flex min-w-0 items-center gap-3 font-medium">
                          <span className={ui.avatar}>{p.name.charAt(0).toUpperCase()}</span>
                          <span className="truncate">{p.name}</span>
                        </span>
                      </td>
                      <td className={cx(POP_TD, ui.num, 'text-muted max-sm:hidden')}>{money(p.lastPrice, 2)}</td>
                      <td className={cx(POP_TD, ui.num, 'text-muted')}>{p.units}</td>
                      <td className={cx(POP_TD, ui.num)}>{money(p.revenue, 2)}</td>
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

// Dashboard panels: white boxes with a title row
const PANEL = 'min-w-0 rounded-lg bg-surface px-6 py-5.5 max-md:px-4 max-md:py-4.5'
const PANEL_HEAD = 'mb-4.5 flex flex-wrap items-center justify-between gap-3'
const POP_TH = 'pb-2.5 text-left text-[0.78rem] font-medium text-muted'
const POP_TD = 'py-2.25 text-heading'

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
    <div className="flex min-w-0 flex-col gap-4 rounded-lg bg-surface px-6 pt-5.5 pb-4.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[0.95rem]">{title}</span>
        <span className="grid size-9.5 shrink-0 place-items-center rounded-full bg-chip text-accent">{icon}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-3.5">
        <span className="text-[1.85rem] leading-tight font-bold tracking-tight wrap-break-word text-heading">{value}</span>
        {delta !== null && (
          <span className={cx('text-[0.9rem] font-semibold tabular-nums', good ? 'text-up' : 'text-down')} title="Compared with the previous 30 days">
            {delta >= 0 ? '+' : ''}
            {delta.toFixed(2)}
            {unit === '%' ? '%' : ' pts'}
          </span>
        )}
      </div>
      <span className="-mt-2 text-[0.75rem] text-muted">Last 30 days</span>
    </div>
  )
}
