import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as ordersApi from '../../api/orders'
import { locationsApi } from '../../api/resources'
import type { OrderView, Ratings } from '../../api/types'
import { useBusiness } from '../../businessContext'
import { Badge, ErrorBox, Loading, PageHeader } from '../../components/ui'
import { labelOf, PAYMENT_STATUSES, RATING_DIMENSIONS } from '../../constants/options'
import { useLoad } from '../../hooks/useLoad'
import { formatDateTime, formatMoney } from '../../utils/format'

export default function OrderDetailPage() {
  const { business } = useBusiness()
  const { orderId = '' } = useParams()
  const { data: order, error, reload } = useLoad(() => ordersApi.getOrder(business.id, orderId), [business.id, orderId])

  const backLink = (
    <Link to={`/business/${business.id}/orders`} className="back-link">
      ← All orders
    </Link>
  )
  if (!order) return <div className="page">{backLink}{error ? <ErrorBox message={error} /> : <Loading />}</div>

  const isSeller = order.sellerBusinessId === business.id
  const other = isSeller
    ? { id: order.buyerBusinessId, name: order.buyerBusinessName, role: 'Customer' }
    : { id: order.sellerBusinessId, name: order.sellerBusinessName, role: 'Supplier' }
  const money = (n: number) => formatMoney(n, order.currency)

  return (
    <div className="page">
      {backLink}
      <PageHeader
        title={`Order ${order.orderNumber}`}
        subtitle={`${other.role}: ${other.name} · placed ${formatDateTime(order.orderedAt)}`}
        actions={
          <>
            <Badge value={order.orderStatus} />
            <Badge value={order.paymentStatus} />
            <Link to={`/business/${business.id}/messages?to=${other.id}`} className="btn btn-ghost">
              Message {other.role.toLowerCase()}
            </Link>
          </>
        }
      />

      {order.statusReason && <p className="alert alert-warn">Reason: {order.statusReason}</p>}

      {isSeller ? <SellerActions order={order} onChanged={reload} /> : <BuyerActions order={order} onChanged={reload} />}

      <div className="table-wrap card">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th className="num">Qty</th>
              <th className="num">Unit price</th>
              <th className="num">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i}>
                <td className="strong">
                  {item.productName}
                  {item.variantName && ` (${item.variantName})`}
                </td>
                <td>{item.sku || '—'}</td>
                <td className="num">
                  {item.quantity} {item.unit}
                </td>
                <td className="num">{money(item.unitPrice)}</td>
                <td className="num">{money(item.subtotal)}</td>
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

      <div className="details-sections">
        <section className="card details-card">
          <h3>Delivery</h3>
          <dl className="details">
            <Detail label="Method" value={labelOf(order.fulfillmentMethod)} />
            <Detail label="Delivery status" value={labelOf(order.deliveryStatus)} />
            {order.shippingAddress && (
              <div className="span-all">
                <dt>Address</dt>
                <dd>
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
                </dd>
              </div>
            )}
          </dl>
        </section>
        <section className="card details-card">
          <h3>Payment</h3>
          <dl className="details">
            <Detail label="Method" value={labelOf(order.paymentMethodType)} />
            <Detail label="Terms" value={labelOf(order.paymentTerm)} />
            {order.notes && <Detail label="Buyer's notes" value={order.notes} wide />}
          </dl>
          {order.paymentInstructions.map((p, i) => (
            <div key={i} className="payment-instructions">
              <strong>
                {labelOf(p.paymentType)} {p.provider && `· ${p.provider}`}
              </strong>
              {p.accountName && <span>Account name: {p.accountName}</span>}
              {p.accountNumber && <span>Account number: {p.accountNumber}</span>}
              {p.instructions && <span className="pre-line">{p.instructions}</span>}
            </div>
          ))}
        </section>
        <section className="card details-card">
          <h3>Timeline</h3>
          <dl className="details">
            <Detail label="Ordered" value={formatDateTime(order.orderedAt)} />
            <Detail label="Confirmed" value={formatDateTime(order.confirmedAt)} />
            <Detail label="Shipped" value={formatDateTime(order.shippedAt)} />
            <Detail label="Delivered" value={formatDateTime(order.deliveredAt)} />
            <Detail label="Completed" value={formatDateTime(order.completedAt)} />
            {order.cancelledAt && <Detail label="Cancelled / rejected" value={formatDateTime(order.cancelledAt)} />}
          </dl>
        </section>
      </div>
    </div>
  )
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <tr className={strong ? 'total-row strong' : 'total-row'}>
      <td colSpan={4} className="num">
        {label}
      </td>
      <td className="num">{value}</td>
    </tr>
  )
}

function Detail({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? 'span-all' : undefined}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

/** Runs an order action and shows its error, if any. */
function useAction(onChanged: () => void) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function run(action: () => Promise<unknown>) {
    setError('')
    setBusy(true)
    try {
      await action()
      onChanged()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return { error, busy, run }
}

const CHARGE_LABELS = { deliveryFee: 'Delivery fee', tax: 'Tax', discount: 'Discount' }

function SellerActions({ order, onChanged }: { order: OrderView; onChanged: () => void }) {
  const { business, can } = useBusiness()
  const { data: locations = [] } = useLoad(() => locationsApi.list(business.id), [business.id])
  const [locationId, setLocationId] = useState('')
  const [reason, setReason] = useState('')
  const [charges, setCharges] = useState({ deliveryFee: order.deliveryFee, tax: order.tax, discount: order.discount })
  const { error, busy, run } = useAction(onChanged)

  const status = order.orderStatus
  const canHandle = can('orders.sell')
  const canRecordPayment = can('orders.sell') || can('payments.manage')
  const setStatus = (newStatus: string, extra: { fulfillmentLocationId?: string; reason?: string } = {}) =>
    run(() => ordersApi.changeOrderStatus(business.id, order.id, { status: newStatus, ...extra }))
  const chosenLocation = locationId || locations.find((l) => l.isPrimary)?.id || ''

  if (!canHandle && !canRecordPayment) return null

  return (
    <section className="card form-card action-card">
      <h2>What's next</h2>

      {canHandle && status === 'PENDING' && (
        <>
          <p className="hint">Check the charges, then confirm. Confirming reserves the stock at the location you choose.</p>
          <div className="form-grid three">
            {(Object.keys(CHARGE_LABELS) as (keyof typeof CHARGE_LABELS)[]).map((key) => (
              <label key={key}>
                {CHARGE_LABELS[key]}
                <input
                  type="number"
                  step="any"
                  min={0}
                  value={charges[key]}
                  onChange={(e) => setCharges((c) => ({ ...c, [key]: Number(e.target.value) }))}
                />
              </label>
            ))}
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => run(() => ordersApi.changeOrderCharges(business.id, order.id, charges))}>
              Update charges
            </button>
          </div>
          <div className="action-row">
            <label>
              Ship from
              <select value={chosenLocation} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">Select location…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.locationName}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn-primary btn-auto" disabled={busy || !chosenLocation} onClick={() => setStatus('CONFIRMED', { fulfillmentLocationId: chosenLocation })}>
              Confirm order
            </button>
          </div>
          <div className="action-row">
            <label>
              Reason (for rejecting)
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Out of stock" />
            </label>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setStatus('REJECTED', { reason })}>
              Reject order
            </button>
          </div>
        </>
      )}

      {canHandle && status === 'CONFIRMED' && (
        <div className="action-row">
          <button type="button" className="btn btn-primary btn-auto" disabled={busy} onClick={() => setStatus('SHIPPED')}>
            {order.fulfillmentMethod === 'PICKUP' ? 'Mark picked up' : 'Mark shipped'}
          </button>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for cancelling" />
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setStatus('CANCELLED', { reason })}>
            Cancel order
          </button>
        </div>
      )}

      {canHandle && status === 'SHIPPED' && (
        <div className="action-row">
          <button type="button" className="btn btn-primary btn-auto" disabled={busy} onClick={() => setStatus('DELIVERED')}>
            Mark delivered
          </button>
        </div>
      )}

      {['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(status) && (
        <p className="hint">
          {status === 'DELIVERED' ? 'Waiting for the buyer to confirm they received it.' : `This order is ${labelOf(status).toLowerCase()}.`}
        </p>
      )}

      {canRecordPayment && !['CANCELLED', 'REJECTED'].includes(status) && (
        <div className="action-row">
          <label>
            Payment status
            <select
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
  const { error, busy, run } = useAction(onChanged)
  const status = order.orderStatus
  const setStatus = (newStatus: string) => run(() => ordersApi.changeOrderStatus(business.id, order.id, { status: newStatus }))

  const canReview = status === 'COMPLETED' && !order.reviewed && can('reviews.write')
  const waiting: Record<string, string> = {
    PENDING: 'Waiting for the supplier to confirm.',
    CONFIRMED: 'The supplier confirmed your order. Pay using the details below.',
    SHIPPED: 'Your order is on the way.',
    COMPLETED: order.reviewed ? 'Completed. Thanks for your review!' : 'Completed.',
  }

  return (
    <section className="card form-card action-card">
      <h2>What's next</h2>
      {waiting[status] && <p className="hint">{waiting[status]}</p>}
      <div className="action-row">
        {status === 'PENDING' && can('orders.buy') && (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setStatus('CANCELLED')}>
            Cancel order
          </button>
        )}
        {status === 'DELIVERED' && can('orders.buy') && (
          <button type="button" className="btn btn-primary btn-auto" disabled={busy} onClick={() => setStatus('COMPLETED')}>
            I received it — complete order
          </button>
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const scores = Object.fromEntries(
      RATING_DIMENSIONS.map((d) => [d.value, ratings[d.value] ? Number(ratings[d.value]) : null]),
    ) as Ratings
    try {
      await ordersApi.reviewOrder(business.id, order.id, { ratings: scores, review: text })
      onDone()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="review-form">
      <h3>Review {order.sellerBusinessName}</h3>
      <div className="form-grid three">
        {RATING_DIMENSIONS.map((d) => (
          <label key={d.value}>
            {d.label}
            <select value={ratings[d.value] ?? ''} onChange={(e) => setRatings((r) => ({ ...r, [d.value]: e.target.value }))}>
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
      <label>
        Your review
        <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
      </label>
      <ErrorBox message={error} />
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-auto">
          Post review
        </button>
      </div>
    </form>
  )
}
