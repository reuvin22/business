import { useState } from 'react'
import { FormSection } from '../../../components/FieldForm'
import { ACTIVE_STATUSES, BUSINESS_TYPES, PRICE_TYPES } from '../../../constants/options'
import { cx, ui } from '../../../styles'
import { newPriceRow, type PriceRow, type VariantRow } from './rows'

type Props = { rows: PriceRow[]; onChange: (rows: PriceRow[]) => void; variants: VariantRow[]; currency: string }

/** The selling prices. At least one is needed; add more for bigger quantities, variants, or buyer types. */
export default function PricesEditor({ rows, onChange, variants, currency }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const update = (rowKey: string, changes: Partial<PriceRow>) =>
    onChange(rows.map((row) => (row.rowKey === rowKey ? { ...row, ...changes } : row)))

  return (
    <FormSection
      title={`Selling prices (${currency}) *`}
      hint="Example: 1–9 pcs = 120, 10–49 = 110, 50+ = 100. Buyers get the lowest price that fits their order."
    >
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.rowKey} className="rounded-lg border border-line p-3">
            <div className="grid grid-cols-2 items-end gap-2.5 @2xl:grid-cols-[1.2fr_0.8fr_0.8fr_1.4fr_1.4fr_auto]">
              <label className={ui.label}>
                Price per unit *
                <input className={ui.input} type="number" step="any" min={0} value={row.price} onChange={(e) => update(row.rowKey, { price: e.target.value })} placeholder="0.00" />
              </label>
              <label className={ui.label}>
                From qty *
                <input className={ui.input} type="number" min={1} value={row.minimumQuantity} onChange={(e) => update(row.rowKey, { minimumQuantity: e.target.value })} />
              </label>
              <label className={ui.label}>
                To qty
                <input className={ui.input} type="number" min={1} value={row.maximumQuantity} onChange={(e) => update(row.rowKey, { maximumQuantity: e.target.value })} placeholder="No limit" />
              </label>
              <label className={ui.label}>
                For variant
                <select className={ui.input} value={row.variantKey} onChange={(e) => update(row.rowKey, { variantKey: e.target.value })}>
                  <option value="">All variants</option>
                  {variants.map((v) => (
                    <option key={v.key} value={v.key}>
                      {v.variantName || '(unnamed variant)'}
                    </option>
                  ))}
                </select>
              </label>
              <label className={ui.label}>
                For buyers
                <select className={ui.input} value={row.customerType} onChange={(e) => update(row.rowKey, { customerType: e.target.value })}>
                  <option value="">Everyone</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label} only
                    </option>
                  ))}
                </select>
              </label>
              <div className="col-span-2 flex gap-3 pb-2.5 @2xl:col-span-1">
                <button type="button" className={ui.link} onClick={() => setOpenKey(openKey === row.rowKey ? null : row.rowKey)}>
                  {openKey === row.rowKey ? 'Less' : 'More'}
                </button>
                <button
                  type="button"
                  className={ui.linkDanger}
                  disabled={rows.length === 1}
                  title={rows.length === 1 ? 'A product needs at least one price' : undefined}
                  onClick={() => onChange(rows.filter((r) => r.rowKey !== row.rowKey))}
                >
                  Remove
                </button>
              </div>
            </div>

            {openKey === row.rowKey && (
              <div className="mt-3 grid grid-cols-1 gap-2.5 border-t border-line pt-3 @sm:grid-cols-2 @2xl:grid-cols-4">
                <label className={ui.label}>
                  Price type
                  <select className={ui.input} value={row.priceType} onChange={(e) => update(row.rowKey, { priceType: e.target.value })}>
                    {PRICE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={ui.label}>
                  Valid from
                  <input className={ui.input} type="date" value={row.effectiveFrom} onChange={(e) => update(row.rowKey, { effectiveFrom: e.target.value })} />
                </label>
                <label className={ui.label}>
                  Valid until
                  <input className={ui.input} type="date" value={row.effectiveUntil} onChange={(e) => update(row.rowKey, { effectiveUntil: e.target.value })} />
                </label>
                <label className={ui.label}>
                  Status
                  <select className={ui.input} value={row.status} onChange={(e) => update(row.rowKey, { status: e.target.value })}>
                    {ACTIVE_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        ))}
        <button type="button" className={cx(ui.btnGhost, 'self-start')} onClick={() => onChange([...rows, newPriceRow()])}>
          + Add another price
        </button>
      </div>
    </FormSection>
  )
}
