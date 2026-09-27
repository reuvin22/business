import { useState } from 'react'
import { FormSection } from '../../../components/FieldForm'
import { PairsEditor } from '../../../components/ListEditors'
import { ACTIVE_STATUSES, UNITS } from '../../../constants/options'
import { cx, ui } from '../../../styles'
import { newVariantRow, type VariantRow } from './rows'

/** Variants are optional: e.g. Cola → 290ml, 1.5L, 2L. Each can have its own SKU, stock, and prices. */
export default function VariantsEditor({ rows, onChange }: { rows: VariantRow[]; onChange: (rows: VariantRow[]) => void }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const update = (key: string, changes: Partial<VariantRow>) =>
    onChange(rows.map((row) => (row.key === key ? { ...row, ...changes } : row)))

  return (
    <FormSection title="Variants (optional)" hint="Different versions of the product, e.g. sizes or flavors. Leave empty if there is only one.">
      <div className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.key} className="rounded-lg border border-line p-3">
            <div className="grid grid-cols-1 items-end gap-2.5 @sm:grid-cols-2 @2xl:grid-cols-[2fr_1.4fr_1fr_1fr_auto]">
              <label className={ui.label}>
                Variant name *
                <input className={ui.input} value={row.variantName} onChange={(e) => update(row.key, { variantName: e.target.value })} placeholder="e.g. 1.5L" />
              </label>
              <label className={ui.label}>
                SKU
                <input className={ui.input} value={row.sku} onChange={(e) => update(row.key, { sku: e.target.value })} />
              </label>
              <label className={ui.label}>
                Unit
                <select className={ui.input} value={row.unit} onChange={(e) => update(row.key, { unit: e.target.value })}>
                  <option value="">Same as product</option>
                  {UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={ui.label}>
                Status
                <select className={ui.input} value={row.status} onChange={(e) => update(row.key, { status: e.target.value })}>
                  {ACTIVE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-3 pb-2.5">
                <button type="button" className={ui.link} onClick={() => setOpenKey(openKey === row.key ? null : row.key)}>
                  {openKey === row.key ? 'Less' : 'More'}
                </button>
                <button type="button" className={ui.linkDanger} onClick={() => onChange(rows.filter((r) => r.key !== row.key))}>
                  Remove
                </button>
              </div>
            </div>

            {openKey === row.key && (
              <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
                <div className="grid grid-cols-1 gap-2.5 @sm:grid-cols-2 @2xl:grid-cols-5">
                  {(
                    [
                      ['barcode', 'Barcode'],
                      ['weightKg', 'Weight (kg)'],
                      ['lengthCm', 'Length (cm)'],
                      ['widthCm', 'Width (cm)'],
                      ['heightCm', 'Height (cm)'],
                    ] as const
                  ).map(([field, label]) => (
                    <label key={field} className={ui.label}>
                      {label}
                      <input
                        className={ui.input}
                        type={field === 'barcode' ? 'text' : 'number'}
                        step="any"
                        value={row[field]}
                        onChange={(e) => update(row.key, { [field]: e.target.value })}
                      />
                    </label>
                  ))}
                </div>
                <PairsEditor
                  title="Attributes"
                  pairs={row.attributes}
                  onChange={(attributes) => update(row.key, { attributes })}
                  namePlaceholder="e.g. Flavor"
                  valuePlaceholder="e.g. Original"
                />
              </div>
            )}
          </div>
        ))}
        <button type="button" className={cx(ui.btnGhost, 'self-start')} onClick={() => onChange([...rows, newVariantRow()])}>
          + Add variant
        </button>
      </div>
    </FormSection>
  )
}
