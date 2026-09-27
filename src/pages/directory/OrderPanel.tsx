import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { placeOrder, quoteOrder } from '../../api/orders'
import { locationsApi } from '../../api/resources'
import type { Address, Business, Location, OrderIn, Price, PublicProduct, PublicProfile, Quote } from '../../api/types'
import { FormSection } from '../../components/FieldForm'
import { ErrorBox } from '../../components/ui'
import { FULFILLMENT_METHODS, labelOf } from '../../constants/options'
import { useLoad } from '../../hooks/useLoad'
import { formatMoney } from '../../utils/format'
import { cx, ui } from '../../styles'

/** buyer = the business ordering. Pass null to show the catalog without ordering. */
type Props = { profile: PublicProfile; products: PublicProduct[]; buyer: Business | null }

const EMPTY_ADDRESS: Address = {
  recipientName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  barangay: '',
  city: '',
  province: '',
  region: '',
  postalCode: '',
  country: 'Philippines',
}

function addressFromLocation(location: Location, buyer: Business): Address {
  return {
    ...EMPTY_ADDRESS,
    recipientName: buyer.businessName,
    phone: location.contactPhone || buyer.primaryPhone,
    addressLine1: location.addressLine1,
    addressLine2: location.addressLine2,
    barangay: location.barangay,
    city: location.city,
    province: location.province,
    region: location.region,
    postalCode: location.postalCode,
  }
}

// One line of the price check: name, unit price, subtotal
const QUOTE_LINE = 'grid grid-cols-[1fr_auto_120px] gap-3 text-[0.9rem] [&>strong]:text-right [&>strong]:text-heading'

/** A row you can order: a product, or one of its variants. */
type Row = { key: string; product: PublicProduct; variantId: string | null; name: string; unit: string }

function orderRows(products: PublicProduct[]): Row[] {
  return products.flatMap((p): Row[] =>
    p.variants.length === 0
      ? [{ key: `${p.id}|`, product: p, variantId: null, name: p.productName, unit: p.unit }]
      : p.variants.map((v) => ({
          key: `${p.id}|${v.id}`,
          product: p,
          variantId: v.id,
          name: `${p.productName} — ${v.variantName}`,
          unit: v.unit || p.unit,
        })),
  )
}

/** The price tiers that apply to a row: the variant's own tiers, else the product-wide ones. */
function tiersFor(row: Row): Price[] {
  const own = row.product.prices.filter((p) => row.variantId && p.variantId === row.variantId)
  const tiers = own.length ? own : row.product.prices.filter((p) => p.variantId === null)
  return [...tiers].sort((a, b) => a.minimumQuantity - b.minimumQuantity)
}

export default function OrderPanel({ profile, products, buyer }: Props) {
  const navigate = useNavigate()
  const seller = profile.business
  const money = (n: number | null) => formatMoney(n, seller.currency)
  const { data: buyerLocations = [] } = useLoad(() => (buyer ? locationsApi.list(buyer.id) : Promise.resolve([])), [buyer?.id])

  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const availableMethods = FULFILLMENT_METHODS.filter(
    (m) =>
      (m.value === 'PICKUP' && profile.delivery.pickupAvailable) ||
      (m.value === 'DELIVERY' && profile.delivery.deliveryAvailable) ||
      (m.value === 'SHIPPING' && profile.delivery.shippingAvailable),
  )
  const [method, setMethod] = useState(availableMethods[0]?.value ?? 'PICKUP')
  const [address, setAddress] = useState<Address | null>(null)
  const [paymentType, setPaymentType] = useState(profile.paymentTypes[0] ?? '')
  const [paymentTerm, setPaymentTerm] = useState(profile.paymentTerms.paymentTerms[0] ?? '')
  const [notes, setNotes] = useState('')
  const [quote, setQuote] = useState<{ key: string; result: Quote } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Pre-fill the address with the buyer's primary location until the user types their own
  const primary = buyerLocations.find((l) => l.isPrimary) ?? buyerLocations[0]
  const shownAddress: Address = address ?? (primary && buyer ? addressFromLocation(primary, buyer) : EMPTY_ADDRESS)
  const setAddressField = (key: keyof Address, value: string) => setAddress({ ...shownAddress, [key]: value })

  const rows = orderRows(products)
  const items = rows
    .map((row) => ({ productId: row.product.id, variantId: row.variantId, quantity: Number(quantities[row.key] || 0) }))
    .filter((item) => item.quantity > 0)

  const body: OrderIn = {
    sellerBusinessId: seller.id,
    items,
    fulfillmentMethod: method,
    shippingAddress: method === 'PICKUP' ? null : shownAddress,
    paymentMethodType: paymentType || null,
    paymentTerm: paymentTerm || null,
    notes,
  }
  const bodyKey = JSON.stringify(body)
  const currentQuote = quote?.key === bodyKey ? quote.result : null

  async function run(action: () => Promise<void>) {
    setError('')
    setBusy(true)
    try {
      await action()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const checkPrices = (buyerId: string) => run(async () => setQuote({ key: bodyKey, result: await quoteOrder(buyerId, body) }))
  const submit = (buyerId: string) =>
    run(async () => {
      const order = await placeOrder(buyerId, body)
      navigate(`/business/${buyerId}/orders/${order.id}`)
    })

  if (rows.length === 0) return <p className={ui.hint}>This business has no public products yet.</p>

  return (
    <div className="flex flex-col gap-4.5">
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              <th className={ui.th}>Product</th>
              <th className={ui.th}>Prices</th>
              <th className={ui.th}>Order rules</th>
              {buyer && <th className={cx(ui.th, ui.num)}>Quantity</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const rules = row.product.orderRules
              const myPrice = row.product.customerPrices.find((cp) => cp.variantId === null || cp.variantId === row.variantId)
              const image = row.product.images.find((i) => i.isPrimary) ?? row.product.images[0]
              return (
                <tr key={row.key}>
                  <td className={cx(ui.td, ui.strong)}>
                    <span className={ui.rowLink}>
                      {image && <img src={image.imageUrl} alt="" className={ui.thumb} />}
                      <span>
                        {row.name}
                        {row.product.description && <span className="block text-[0.82rem] whitespace-normal text-muted">{row.product.description}</span>}
                      </span>
                    </span>
                  </td>
                  <td className={cx(ui.td, ui.small)}>
                    {myPrice && (
                      <div className="font-bold text-info">
                        Your price: {money(myPrice.price)} (from {myPrice.minimumQuantity})
                      </div>
                    )}
                    {tiersFor(row).map((tier) => (
                      <div key={tier.id}>
                        {tier.minimumQuantity}
                        {tier.maximumQuantity ? `–${tier.maximumQuantity}` : '+'} {row.unit}: <strong>{money(tier.price)}</strong>
                        {tier.customerType && <span className="text-muted"> ({labelOf(tier.customerType)} only)</span>}
                      </div>
                    ))}
                    {!myPrice && tiersFor(row).length === 0 && <span className="text-muted">Ask for price</span>}
                  </td>
                  <td className={cx(ui.td, ui.small)}>
                    MOQ {rules.minimumOrderQuantity}
                    {rules.orderMultiple > 1 && ` · multiples of ${rules.orderMultiple}`}
                    {rules.leadTimeDays !== null && ` · ${rules.leadTimeDays} day lead time`}
                  </td>
                  {buyer && (
                  <td className={cx(ui.td, ui.num)}>
                    <input
                      type="number"
                      min={0}
                      step={rules.orderMultiple}
                      className={cx(ui.inputAuto, 'w-24 text-right')}
                      value={quantities[row.key] ?? ''}
                      onChange={(e) => setQuantities((q) => ({ ...q, [row.key]: e.target.value }))}
                      aria-label={`Quantity of ${row.name}`}
                    />
                  </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {buyer && items.length > 0 && (
        <section className={ui.formCard}>
          <h2 className={ui.h2}>Checkout as {buyer.businessName}</h2>
          <div className={ui.formGrid3}>
            <label className={ui.label}>
              Receive by
              <select className={ui.input} value={method} onChange={(e) => setMethod(e.target.value)}>
                {availableMethods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={ui.label}>
              Payment method
              <select className={ui.input} value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                <option value="">Discuss with seller</option>
                {profile.paymentTypes.map((t) => (
                  <option key={t} value={t}>
                    {labelOf(t)}
                  </option>
                ))}
              </select>
            </label>
            <label className={ui.label}>
              Payment terms
              <select className={ui.input} value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)}>
                <option value="">Discuss with seller</option>
                {profile.paymentTerms.paymentTerms.map((t) => (
                  <option key={t} value={t}>
                    {labelOf(t)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {method !== 'PICKUP' && (
            <FormSection title="Delivery address">
              <div className={ui.formGrid3}>
                {(
                  [
                    ['recipientName', 'Recipient'],
                    ['phone', 'Phone'],
                    ['addressLine1', 'Street address'],
                    ['barangay', 'Barangay'],
                    ['city', 'City *'],
                    ['province', 'Province'],
                    ['region', 'Region'],
                    ['postalCode', 'Postal code'],
                  ] as [keyof Address, string][]
                ).map(([key, label]) => (
                  <label key={key}>
                    {label}
                    <input className={ui.input} value={shownAddress[key]} onChange={(e) => setAddressField(key, e.target.value)} />
                  </label>
                ))}
              </div>
            </FormSection>
          )}

          <label className={ui.label}>
            Notes for the seller
            <textarea className={ui.input} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          {currentQuote && (
            <div className="flex flex-col gap-1.5 rounded-lg bg-page px-4 py-3.5">
              {currentQuote.lines.map((line, i) => (
                <div key={i} className={QUOTE_LINE}>
                  <span>
                    {line.productName}
                    {line.variantName && ` (${line.variantName})`} × {line.quantity}
                  </span>
                  <span>{line.unitPrice === null ? '—' : `${money(line.unitPrice)} each`}</span>
                  <strong>{money(line.subtotal)}</strong>
                </div>
              ))}
              <div className={QUOTE_LINE}>
                <span>Delivery fee</span>
                <span />
                <strong>{money(currentQuote.deliveryFee)}</strong>
              </div>
              <div className={cx(QUOTE_LINE, 'border-t border-line pt-2 text-base')}>
                <span>Total</span>
                <span />
                <strong>{money(currentQuote.total)}</strong>
              </div>
              {currentQuote.problems.length > 0 && (
                <ul className={cx(ui.alertWarn, 'mt-2 list-disc pl-7')}>
                  {currentQuote.problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <ErrorBox message={error} />
          <div className={ui.formActions}>
            <button type="button" className={ui.btnGhost} disabled={busy} onClick={() => checkPrices(buyer.id)}>
              {currentQuote ? 'Check again' : 'Check prices'}
            </button>
            <button
              type="button"
              className={ui.btnPrimary}
              disabled={busy || !currentQuote || currentQuote.problems.length > 0}
              onClick={() => submit(buyer.id)}
              title={!currentQuote ? 'Check prices first' : undefined}
            >
              Place order
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
