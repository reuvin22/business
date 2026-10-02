import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { startConversation } from '../../api/network'
import { placeOrder, quoteOrder } from '../../api/orders'
import { locationsApi } from '../../api/resources'
import type { Address, Business, Location, OrderIn, Price, PublicProduct, PublicProfile, Quote } from '../../api/types'
import { FormSection } from '../../components/FieldForm'
import { BusyButton, ErrorBox, Modal, ProductThumb } from '../../components/ui'
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

/** "1–15 pcs", "50+ pcs" */
const rangeText = (tier: Price, unit: string) => `${tier.minimumQuantity}${tier.maximumQuantity ? `–${tier.maximumQuantity}` : '+'} ${unit}`

export default function OrderPanel({ profile, products, buyer }: Props) {
  const seller = profile.business
  const money = (n: number | null) => formatMoney(n, seller.currency)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [checkingOut, setCheckingOut] = useState(false)
  const [search, setSearch] = useState('')

  const rows = orderRows(products)
  // Search: every word must be in the name, variant, SKU, barcode, or description. Quantities already set stay.
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  const shown = rows.filter((row) => {
    const variant = row.product.variants.find((v) => v.id === row.variantId)
    const text = [row.name, row.product.sku, row.product.barcode, variant?.sku, variant?.barcode, row.product.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return words.every((word) => text.includes(word))
  })
  const items = rows
    .map((row) => ({ productId: row.product.id, variantId: row.variantId, quantity: quantities[row.key] ?? 0 }))
    .filter((item) => item.quantity > 0)
  const units = items.reduce((sum, item) => sum + item.quantity, 0)

  if (rows.length === 0) return <p className={ui.hint}>This business has no public products yet.</p>

  return (
    <div className="flex flex-col gap-4.5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          className={cx(ui.input, 'max-w-md flex-1')}
          placeholder="Search products by name, SKU, or barcode…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search products"
        />
        <span className={ui.hint}>{words.length ? `${shown.length} of ${rows.length} products` : `${rows.length} products`}</span>
      </div>

      {shown.length === 0 ? (
        <p className={cx(ui.hint, 'm-0 rounded-lg border border-dashed border-line px-4 py-8 text-center')}>
          No products match "{search}".{' '}
          <button type="button" className={ui.link} onClick={() => setSearch('')}>
            Show all
          </button>
        </p>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>Product</th>
                <th className={ui.th}>Price</th>
                <th className={ui.th}>Order rules</th>
                {buyer && <th className={cx(ui.th, ui.num)}>Quantity</th>}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => {
                const rules = row.product.orderRules
                const myPrice = row.product.customerPrices.find((cp) => cp.variantId === null || cp.variantId === row.variantId)
                const tiers = tiersFor(row)
                return (
                  <tr key={row.key}>
                    <td className={cx(ui.td, ui.strong)}>
                      <span className={ui.rowLink}>
                        <ProductThumb images={row.product.images} size="md" />
                        <span>
                          {row.name}
                          {row.product.description && (
                            <span className="block text-[0.82rem] font-normal whitespace-normal text-muted">{row.product.description}</span>
                          )}
                        </span>
                      </span>
                    </td>
                    <td className={ui.td}>
                      <div className="flex min-w-44 flex-col gap-1.5">
                        {myPrice && (
                          <div className="flex items-baseline justify-between gap-3 rounded-md bg-info-soft px-2 py-1">
                            <strong className="text-info tabular-nums">{money(myPrice.price)}</strong>
                            <span className="text-[0.78rem] text-info">
                              your price · {myPrice.minimumQuantity}+ {row.unit}
                            </span>
                          </div>
                        )}
                        {tiers.map((tier) => (
                          <div key={tier.id} className="flex items-baseline justify-between gap-3">
                            <strong className="text-heading tabular-nums">{money(tier.price)}</strong>
                            <span className="text-[0.8rem] whitespace-nowrap text-muted">
                              {rangeText(tier, row.unit)}
                              {tier.customerType && ` · ${labelOf(tier.customerType)} only`}
                            </span>
                          </div>
                        ))}
                        {!myPrice && tiers.length === 0 && <span className="text-muted">Ask for price</span>}
                      </div>
                    </td>
                    <td className={cx(ui.td, ui.small)}>
                      <span className="block">
                        Min. order {rules.minimumOrderQuantity} {row.unit}
                      </span>
                      {rules.maximumOrderQuantity !== null && (
                        <span className="block">
                          Max. order {rules.maximumOrderQuantity} {row.unit}
                        </span>
                      )}
                      {rules.orderMultiple > 1 && <span className="block text-muted">In multiples of {rules.orderMultiple}</span>}
                      {rules.leadTimeDays !== null && <span className="block text-muted">{rules.leadTimeDays} day lead time</span>}
                    </td>
                    {buyer && (
                      <td className={cx(ui.td, ui.num)}>
                        <QuantityStepper
                          value={quantities[row.key] ?? 0}
                          min={rules.minimumOrderQuantity}
                          max={rules.maximumOrderQuantity}
                          step={rules.orderMultiple}
                          label={row.name}
                          onChange={(quantity) => setQuantities((q) => ({ ...q, [row.key]: quantity }))}
                        />
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* What is in the order so far; the delivery and payment details come in the next step */}
      {buyer && items.length > 0 && (
        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4.5 py-3.5 shadow-xl">
          <span className="text-heading">
            <strong>{items.length}</strong> {items.length === 1 ? 'product' : 'products'} · <strong>{units}</strong> units
          </span>
          <div className="flex gap-2.5">
            <button type="button" className={ui.btnGhost} onClick={() => setQuantities({})}>
              Clear
            </button>
            <button type="button" className={ui.btnPrimary} onClick={() => setCheckingOut(true)}>
              Continue to order
            </button>
          </div>
        </div>
      )}

      {buyer && checkingOut && <CheckoutDialog profile={profile} buyer={buyer} items={items} onClose={() => setCheckingOut(false)} />}
    </div>
  )
}

/** − [0] +: the first + jumps to the minimum order; quantities follow the multiple; going under the minimum
 * clears it; it never goes over the maximum order (the seller's limit). */
function QuantityStepper({
  value,
  min,
  max,
  step,
  label,
  onChange,
}: {
  value: number
  min: number
  max: number | null
  step: number
  label: string
  onChange: (value: number) => void
}) {
  const start = Math.max(min, step)
  const next = value === 0 ? start : value + step
  const atMax = max !== null && next > max
  const up = () => !atMax && onChange(next)
  const down = () => onChange(value - step < min ? 0 : value - step)
  const button =
    'grid size-8 cursor-pointer place-items-center rounded-md border border-line bg-surface text-[1.1rem] font-bold text-heading hover:enabled:border-accent disabled:cursor-not-allowed disabled:opacity-40'

  return (
    <div className="inline-flex items-center gap-1.5">
      <button type="button" className={button} onClick={down} disabled={value === 0} aria-label={`One step less of ${label}`}>
        −
      </button>
      <input
        type="number"
        min={0}
        step={step}
        inputMode="numeric"
        className={cx(ui.inputAuto, 'w-16 px-2 py-1.5 text-center tabular-nums', value > 0 && 'border-accent font-bold text-heading')}
        value={value}
        onFocus={(e) => e.target.select()}
        max={max ?? undefined}
        onChange={(e) => {
          const typed = Math.max(0, Math.floor(Number(e.target.value) || 0))
          onChange(max !== null ? Math.min(typed, max) : typed)
        }}
        aria-label={`Quantity of ${label}`}
      />
      <button
        type="button"
        className={button}
        onClick={up}
        disabled={atMax}
        title={atMax ? `The most you can order is ${max}` : undefined}
        aria-label={`One step more of ${label}`}
      >
        +
      </button>
    </div>
  )
}

/** The second step: how to receive it and pay, the prices worked out by the seller's rules, then place it. */
function CheckoutDialog({
  profile,
  buyer,
  items,
  onClose,
}: {
  profile: PublicProfile
  buyer: Business
  items: OrderIn['items']
  onClose: () => void
}) {
  const navigate = useNavigate()
  const seller = profile.business
  const money = (n: number | null) => formatMoney(n, seller.currency)
  const { data: buyerLocations = [] } = useLoad(() => locationsApi.list(buyer.id), [buyer.id])

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
  const [placing, setPlacing] = useState(false)

  // Pre-fill the address with the buyer's primary location until they type their own
  const primary = buyerLocations.find((l) => l.isPrimary) ?? buyerLocations[0]
  const shownAddress: Address = address ?? (primary ? addressFromLocation(primary, buyer) : EMPTY_ADDRESS)
  const setAddressField = (key: keyof Address, value: string) => setAddress({ ...shownAddress, [key]: value })

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

  // The summary is worked out again by the seller's rules a moment after anything in the order changes
  useEffect(() => {
    let stale = false
    const timer = window.setTimeout(() => {
      quoteOrder(buyer.id, body).then(
        (result) => {
          if (stale) return
          setQuote({ key: bodyKey, result })
          setError('')
        },
        (err: Error) => !stale && setError(err.message),
      )
    }, 400)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
    // bodyKey is the whole order as text: body changes exactly when it does
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyKey, buyer.id])
  // While it is being worked out again, the last summary stays (dimmed)
  const shownQuote = currentQuote ?? quote?.result ?? null

  async function place() {
    setError('')
    setPlacing(true)
    try {
      const checked = await quoteOrder(buyer.id, body) // the final check, with everything as it is now
      if (checked.problems.length) {
        setQuote({ key: bodyKey, result: checked })
        return
      }
      const order = await placeOrder(buyer.id, body)
      // Once, right after placing it: a message to the seller with the order as a card, asking them to confirm it
      try {
        await startConversation(buyer.id, {
          participantBusinessId: seller.id,
          message: `Hi ${seller.businessName}! I placed order ${order.orderNumber}. Please confirm this order.`,
          orderId: order.id,
        })
      } catch {
        // The order is placed either way (e.g. this member may not send messages); the seller is still notified
      }
      navigate(`/business/${buyer.id}/orders/${order.id}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setPlacing(false)
    }
  }

  return (
    <Modal title={`Order from ${seller.businessName}`} onClose={placing ? () => {} : onClose} size="md" closeOnBackdrop={false}>
      <div className="@container flex max-h-[calc(100dvh-2rem)] flex-col sm:max-h-[calc(100dvh-4rem)]">
        <header className="border-b border-line px-6 py-4 max-sm:px-4">
          <h2 className={ui.h2}>Order from {seller.businessName}</h2>
          <p className={ui.hint}>
            As {buyer.businessName}. {seller.businessName} gets these details and accepts or declines the order; you are notified either
            way.
          </p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 max-sm:px-4">
          <FormSection title="Delivery">
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Receive by">
                {availableMethods.length === 0 && (
                  <span className={ui.hint}>The seller has not set how orders are received. Mention it in the notes.</span>
                )}
                {availableMethods.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    role="radio"
                    aria-checked={method === m.value}
                    onClick={() => setMethod(m.value)}
                    className={cx(
                      'cursor-pointer rounded-full border px-4 py-2 text-[0.9rem] font-semibold',
                      method === m.value
                        ? 'border-accent bg-info-soft text-accent'
                        : 'border-line bg-surface text-heading hover:border-muted',
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              {method === 'PICKUP' ? (
                <p className={cx(ui.hint, 'm-0')}>You collect the order at the seller's location.</p>
              ) : (
                <div className="grid grid-cols-1 gap-x-4 gap-y-3 @lg:grid-cols-2">
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
                    <label key={key} className={ui.label}>
                      {label}
                      <input className={ui.input} value={shownAddress[key]} onChange={(e) => setAddressField(key, e.target.value)} />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </FormSection>

          <FormSection title="Payment">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3 @lg:grid-cols-2">
              <label className={ui.label}>
                Payment method
                <select className={ui.input} value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                  <option value="">Discuss with the seller</option>
                  {profile.paymentTypes.map((t) => (
                    <option key={t} value={t}>
                      {labelOf(t)}
                      {profile.acceptedPayments?.find((a) => a.paymentType === t)?.providers.length
                        ? ` (${profile.acceptedPayments.find((a) => a.paymentType === t)!.providers.join(', ')})`
                        : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className={ui.label}>
                Payment terms
                <select className={ui.input} value={paymentTerm} onChange={(e) => setPaymentTerm(e.target.value)}>
                  <option value="">Discuss with the seller</option>
                  {profile.paymentTerms.paymentTerms.map((t) => (
                    <option key={t} value={t}>
                      {labelOf(t)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className={cx(ui.hint, 'mt-2 mb-0')}>The seller's account details are shown on the order once they accept it.</p>
          </FormSection>

          <label className={ui.label}>
            Notes for the seller
            <textarea
              className={ui.input}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Deliver before 10 AM"
            />
          </label>

          <FormSection title="Summary">
            {!shownQuote ? (
              <p className={cx(ui.hint, 'm-0')}>Working out the prices…</p>
            ) : (
              <div className={cx('flex flex-col gap-1.5 rounded-lg bg-page px-4 py-3.5 transition-opacity', !currentQuote && 'opacity-60')}>
                {shownQuote.lines.map((line, i) => (
                  <div key={i} className="grid grid-cols-[1fr_auto_auto] items-baseline gap-3 text-[0.9rem]">
                    <span>
                      {line.productName}
                      {line.variantName && ` (${line.variantName})`}
                    </span>
                    <span className="text-muted tabular-nums">
                      {line.quantity} × {line.unitPrice === null ? '—' : money(line.unitPrice)}
                    </span>
                    <strong className="w-28 text-right text-heading tabular-nums">{money(line.subtotal)}</strong>
                  </div>
                ))}
                <div className="grid grid-cols-[1fr_auto] gap-3 text-[0.9rem]">
                  <span>Delivery fee</span>
                  <strong className="w-28 text-right text-heading tabular-nums">{money(shownQuote.deliveryFee)}</strong>
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-3 border-t border-line pt-2 text-base">
                  <span className="font-semibold text-heading">Total</span>
                  <strong className="w-28 text-right text-heading tabular-nums">{money(shownQuote.total)}</strong>
                </div>
                {shownQuote.problems.length > 0 && (
                  <ul className={cx(ui.alertWarn, 'mt-2 list-disc pl-7')}>
                    {shownQuote.problems.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </FormSection>
        </div>

        <footer className="flex flex-col gap-2.5 rounded-b-xl border-t border-line bg-surface px-6 py-3.5 max-sm:px-4">
          <ErrorBox message={error} />
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button type="button" className={ui.btnGhost} onClick={onClose} disabled={placing}>
              Back
            </button>
            <BusyButton
              className={ui.btnPrimary}
              busy={placing}
              busyLabel="Placing order…"
              disabled={!currentQuote || currentQuote.problems.length > 0}
              onClick={place}
            >
              Place order{shownQuote ? ` · ${money(shownQuote.total)}` : ''}
            </BusyButton>
          </div>
        </footer>
      </div>
    </Modal>
  )
}
