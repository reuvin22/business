import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as ordersApi from '../../api/orders'
import { locationsApi } from '../../api/resources'
import type { Location, OrderView, Ratings } from '../../api/types'
import { useBusiness } from '../../businessContext'
import { DetailItem, DetailsCard, DetailsGrid } from '../../components/DetailsView'
import { Badge, BusyButton, ErrorBox, Loading, PageHeader } from '../../components/ui'
import { labelOf, PAYMENT_STATUSES, RATING_DIMENSIONS } from '../../constants/options'
import { useBusy } from '../../hooks/useBusy'
import { useOnActivity } from '../../hooks/useActivity'
import { useLoad } from '../../hooks/useLoad'
import { formatDateTime, formatMoney } from '../../utils/format'
import { cx, ui } from '../../styles'

export default function OrderDetailPage() {
  const { business } = useBusiness()
  const { orderId = '' } = useParams()
  const { data: order, error, reload } = useLoad(() => ordersApi.getOrder(business.id, orderId), [business.id, orderId])
  // Live: when the other business accepts, declines, ships... this order, it changes on the screen
  useOnActivity(business.id, ['ORDERS'], (activity) => activity.link === `/orders/${orderId}` && reload())

  const backLink = (
    <Link to={`/business/${business.id}/orders`} className={ui.backLink}>
      ← All orders
    </Link>
  )
  if (!order) return <div className={ui.page}>{backLink}{error ? <ErrorBox message={error} /> : <Loading />}</div>

  const isSeller = order.sellerBusinessId === business.id
  const other = isSeller
    ? { id: order.buyerBusinessId, name: order.buyerBusinessName, role: 'Customer' }
    : { id: order.sellerBusinessId, name: order.sellerBusinessName, role: 'Supplier' }
  const money = (n: number) => formatMoney(n, order.currency)

  return (
    <div className={ui.page}>
      {backLink}
      <PageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={`${other.role}: ${other.name} · placed ${formatDateTime(order.orderedAt)}`}
        actions={
          <>
            <Badge value={order.orderStatus} />
            <Badge value={order.paymentStatus} />
            <Link to={`/business/${business.id}/messages?to=${other.id}`} className={ui.btnGhost}>
              Message {other.role.toLowerCase()}
            </Link>
          </>
        }
      />

      {order.statusReason && <p className={ui.alertWarn}>Reason: {order.statusReason}</p>}

      {isSeller ? <SellerActions order={order} onChanged={reload} /> : <BuyerActions order={order} onChanged={reload} />}

      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th className={ui.th}>Product</th>
              <th className={ui.th}>SKU</th>
              <th className={cx(ui.th, ui.num)}>Qty</th>
              <th className={cx(ui.th, ui.num)}>Unit price</th>
              <th className={cx(ui.th, ui.num)}>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i}>
                <td className={cx(ui.td, ui.strong)}>
                  {item.productName}
                  {item.variantName && ` (${item.variantName})`}
                </td>
                <td className={ui.td}>{item.sku || '—'}</td>
                <td className={cx(ui.td, ui.num)}>
                  {item.quantity} {item.unit}
                </td>
                <td className={cx(ui.td, ui.num)}>{money(item.unitPrice)}</td>
                <td className={cx(ui.td, ui.num)}>{money(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <TotalRow label="Subtotal" value={money(order.subtotal)} />
            <TotalRow label="Delivery fee" value={money(order.deliveryFee)} />
            {order.tax > 0 && <TotalRow label="Tax" value={money(order.tax)} />}
            {order.discount > 0 && <TotalRow label="Discount" value={`− ${money(order.discount)}`} />}
            <TotalRow label="Total" value={money(order.total)} strong />
          </tfoot>
        </table>
      </div>

      <DetailsGrid>
        <DetailsCard title="Delivery">
            <Detail label="Method" value={labelOf(order.fulfillmentMethod)} />
            <Detail label="Delivery status" value={labelOf(order.deliveryStatus)} />
            {order.shippingAddress && (
              <DetailItem label="Address" wide>
                  {[
                    order.shippingAddress.recipientName,
                    order.shippingAddress.phone,
                    order.shippingAddress.addressLine1,
                    order.shippingAddress.addressLine2,
                    order.shippingAddress.barangay,
                    order.shippingAddress.city,
                    order.shippingAddress.province,
                    order.shippingAddress.postalCode,
                  ]
                    .filter(Boolean)
                    .join(', ')}
              </DetailItem>
            )}
        </DetailsCard>
        <DetailsCard title="Payment">
            <Detail label="Method" value={labelOf(order.paymentMethodType)} />
            <Detail label="Terms" value={labelOf(order.paymentTerm)} />
            {order.notes && <Detail label="Buyer's notes" value={order.notes} wide />}
          {order.paymentInstructions.map((p, i) => (
            <div key={i} className="col-span-full flex flex-col gap-0.5 rounded-lg bg-info-soft px-3.5 py-3 text-[0.9rem] text-heading">
              <strong>
                {labelOf(p.paymentType)} {p.provider && `· ${p.provider}`}
              </strong>
              {p.accountName && <span>Account name: {p.accountName}</span>}
              {p.accountNumber && <span>Account number: {p.accountNumber}</span>}
              {p.instructions && <span className="whitespace-pre-line">{p.instructions}</span>}
            </div>
          ))}
        </DetailsCard>
        <DetailsCard title="Timeline">
            <Detail label="Ordered" value={formatDateTime(order.orderedAt)} />
            <Detail label="Confirmed" value={formatDateTime(order.confirmedAt)} />
            <Detail label="Shipped" value={formatDateTime(order.shippedAt)} />
            <Detail label="Delivered" value={formatDateTime(order.deliveredAt)} />
            <Detail label="Completed" value={formatDateTime(order.completedAt)} />
            {order.cancelledAt && <Detail label="Cancelled / rejected" value={formatDateTime(order.cancelledAt)} />}
        </DetailsCard>
      </DetailsGrid>
    </div>
  )
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className={cx('[&>td]:border-b-0 [&>td]:py-1.5', strong && 'text-base font-bold text-heading')}>
      <td className={cx(ui.td, ui.num)} colSpan={4}>
        {label}
      </td>
      <td className={cx(ui.td, ui.num)}>{value}</td>
    </tr>
  )
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <DetailItem label={label} wide={wide}>
      {value}
    </DetailItem>
  )
}

/** Runs an order action and shows its error, if any. `active` names the running action (its button spins). */
function useAction(onChanged: () => void) {
  const [error, setError] = useState('')
  const [active, setActive] = useState('')
  async function run(action: () => Promise<unknown>, name = 'action') {
    setError('')
    setActive(name)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setActive('')
    }
  }
  return { error, busy: active !== '', active, run }
}

const CHARGE_LABELS = { deliveryFee: 'Delivery fee', tax: 'Tax', discount: 'Discount' }

function SellerActions({ order, onChanged }: { order: OrderView; onChanged: () => void }) {
  const { business, can } = useBusiness()
  const { data: locations = [] } = useLoad(() => locationsApi.list(business.id), [business.id])
  const [locationId, setLocationId] = useState('')
  const [reason, setReason] = useState('')
  const [charges, setCharges] = useState({ deliveryFee: order.deliveryFee, tax: order.tax, discount: order.discount })
  const { error, busy, active, run } = useAction(onChanged)

  const status = order.orderStatus
  const canHandle = can('orders.sell')
  const canRecordPayment = can('orders.sell') || can('payments.manage')
  const setStatus = (newStatus: string, extra: { fulfillmentLocationId?: string; reason?: string } = {}) =>
    run(() => ordersApi.changeOrderStatus(business.id, order.id, { status: newStatus, ...extra }), newStatus)
  const chosenLocation = locationId || locations.find((l) => l.isPrimary)?.id || ''

  if (!canHandle && !canRecordPayment) return null

  return (
    <section className={ui.formCard}>
      <h2 className={ui.h2}>What's next</h2>

      {canHandle && status === 'PENDING' && (
        <>
          <p className={ui.hint}>Check the charges, then accept. Accepting takes the ordered quantities out of the stock at the location you choose, and tells the buyer.</p>
          <div className={ui.formGrid3}>
            {(Object.keys(CHARGE_LABELS) as (keyof typeof CHARGE_LABELS)[]).map((key) => (
              <label key={key}>
                {CHARGE_LABELS[key]}
                <input className={ui.input}
                  type="number"
                  step="any"
                  min={0}
                  value={charges[key]}
                  onChange={(e) => setCharges((c) => ({ ...c, [key]: Number(e.target.value) }))}
                />
              </label>
            ))}
          </div>
          <div className={ui.formActions}>
            <BusyButton busy={active === 'charges'} className={ui.btnGhost} disabled={busy} onClick={() => run(() => ordersApi.changeOrderCharges(business.id, order.id, charges), 'charges')}>
              Update charges
            </BusyButton>
          </div>
          <div className={ui.actionRow}>
            <label className={ui.label}>
              Ship from
              <select className={ui.input} value={chosenLocation} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Select location…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {shipFromLabel(l, locations, business.businessName)}
                  </option>
                ))}
              </select>
            </label>
            <BusyButton busy={active === 'CONFIRMED'} className={ui.btnSuccess} disabled={busy || !chosenLocation} onClick={() => setStatus('CONFIRMED', { fulfillmentLocationId: chosenLocation })}>
              Accept order
            </BusyButton>
          </div>
          <div className={ui.actionRow}>
            <label className={ui.label}>
              Reason (for rejecting)
              <input className={ui.input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Out of stock" />
            </label>
            <BusyButton busy={active === 'REJECTED'} className={ui.btnDanger} disabled={busy} onClick={() => setStatus('REJECTED', { reason })}>
              Reject order
            </BusyButton>
          </div>
        </>
      )}

      {canHandle && status === 'CONFIRMED' && (
        <div className={ui.actionRow}>
          <BusyButton busy={active === 'SHIPPED'} className={ui.btnPrimary} disabled={busy} onClick={() => setStatus('SHIPPED')}>
            {order.fulfillmentMethod === 'PICKUP' ? 'Mark picked up' : 'Mark shipped'}
          </BusyButton>
          <input className={ui.rowInput} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancelling" />
          <BusyButton busy={active === 'CANCELLED'} className={ui.btnGhost} disabled={busy} onClick={() => setStatus('CANCELLED', { reason })}>
            Cancel order
          </BusyButton>
        </div>
      )}

      {canHandle && status === 'SHIPPED' && (
        <div className={ui.actionRow}>
          <BusyButton busy={active === 'DELIVERED'} className={ui.btnPrimary} disabled={busy} onClick={() => setStatus('DELIVERED')}>
            Mark delivered
          </BusyButton>
        </div>
      )}

      {['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(status) && (
        <p className={ui.hint}>
          {status === 'DELIVERED' ? 'Waiting for the buyer to confirm they received it.' : `This order is ${labelOf(status).toLowerCase()}.`}
        </p>
      )}

      {canRecordPayment && !['CANCELLED', 'REJECTED'].includes(status) && (
        <div className={ui.actionRow}>
          <label className={ui.label}>
            Payment status
            <select className={ui.input}
              value={order.paymentStatus}
              disabled={busy}
              onChange={(e) => run(() => ordersApi.changePaymentStatus(business.id, order.id, e.target.value))}
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <ErrorBox message={error} />
    </section>
  )
}

function BuyerActions({ order, onChanged }: { order: OrderView; onChanged: () => void }) {
  const { business, can } = useBusiness()
  const { error, busy, active, run } = useAction(onChanged)
  const status = order.orderStatus
  const setStatus = (newStatus: string) =>
    run(() => ordersApi.changeOrderStatus(business.id, order.id, { status: newStatus }), newStatus)

  const canReview = status === 'COMPLETED' && !order.reviewed && can('reviews.write')
  const waiting: Record<string, string> = {
    PENDING: 'Waiting for the supplier to confirm.',
    CONFIRMED: 'The supplier confirmed your order. Pay using the details below.',
    SHIPPED: 'Your order is on the way.',
    COMPLETED: order.reviewed ? 'Completed. Thanks for your review!' : 'Completed.',
  }

  return (
    <section className={ui.formCard}>
      <h2 className={ui.h2}>What's next</h2>
      {waiting[status] && <p className={ui.hint}>{waiting[status]}</p>}
      <div className={ui.actionRow}>
        {status === 'PENDING' && can('orders.buy') && (
          <BusyButton busy={active === 'CANCELLED'} className={ui.btnGhost} disabled={busy} onClick={() => setStatus('CANCELLED')}>
            Cancel order
          </BusyButton>
        )}
        {status === 'DELIVERED' && can('orders.buy') && (
          <BusyButton busy={active === 'COMPLETED'} className={ui.btnPrimary} disabled={busy} onClick={() => setStatus('COMPLETED')}>
            I received it — complete order
          </BusyButton>
        )}
      </div>
      <ErrorBox message={error} />
      {canReview && <ReviewForm order={order} onDone={onChanged} />}
    </section>
  )
}

function ReviewForm({ order, onDone }: { order: OrderView; onDone: () => void }) {
  const { business } = useBusiness()
  const [ratings, setRatings] = useState<Record<string, string>>({})
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [saving, runSave] = useBusy()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const scores = Object.fromEntries(
      RATING_DIMENSIONS.map((d) => [d.value, ratings[d.value] ? Number(ratings[d.value]) : null]),
    ) as Ratings
    await runSave(async () => {
      try {
        await ordersApi.reviewOrder(business.id, order.id, { ratings: scores, review: text })
        onDone()
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className={cx(ui.form, 'mt-1 border-t border-line pt-4')}>
      <h3 className={ui.h3}>Review {order.sellerBusinessName}</h3>
      <div className={ui.formGrid3}>
        {RATING_DIMENSIONS.map((d) => (
          <label key={d.value}>
            {d.label}
            <select className={ui.input} value={ratings[d.value] ?? ''} onChange={(e) => setRatings((r) => ({ ...r, [d.value]: e.target.value }))}>
              <option value="">Skip</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {'★'.repeat(n)} ({n})
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <label className={ui.label}>
        Your review
        <textarea className={ui.input} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <ErrorBox message={error} />
      <div className={ui.formActions}>
        <BusyButton type="submit" className={ui.btnPrimary} busy={saving} busyLabel="Posting…">
          Post review
        </BusyButton>
      </div>
    </form>
  )
}

/** "Motor Parts · Head office (Los Baños)": the business ships, from one of its places. The place's own name is
 * added only when two places would otherwise look the same. */
function shipFromLabel(location: Location, all: Location[], businessName: string): string {
  const place = (l: Location) => `${labelOf(l.locationType)}${l.city ? ` (${l.city})` : ''}`
  const twin = all.some((other) => other.id !== location.id && place(other) === place(location))
  return `${businessName} · ${place(location)}${twin ? ` · ${location.locationName}` : ''}`
}

