import { useState, type FormEvent } from 'react'
import { posSettingsApi } from '../../../api/resources'
import type { PosCustomTemplate, PosOrderType, PosTemplate } from '../../../api/types'
import { useBusiness } from '../../../businessContext'
import { FormSection } from '../../../components/FieldForm'
import { BusyButton, ErrorBox, Loading, Modal, Spinner } from '../../../components/ui'
import { useLoad } from '../../../hooks/useLoad'
import { cx, ui } from '../../../styles'

type BuiltIn = Exclude<PosTemplate, 'CUSTOM'>

// The built-in templates, with the switches each is made of (the selling app's src/utils/templates.ts
// does the same). "Customize your own" starts from any of them. Products, prices, stock, and receipts
// are the same in every template; only the till changes.
const BUILT_IN: { value: BuiltIn; label: string; summary: string; features: string[]; switches: Omit<PosCustomTemplate, 'name'> }[] = [
  {
    value: 'DEFAULT',
    label: 'Default (retail)',
    summary: 'Product tiles with photos, the stock left, and barcode search.',
    features: ['Photos on every product', 'Stock left always shown', 'Tap to add, scan to add more'],
    switches: { layout: 'tiles', photos: true, categoryTabs: false, variantButtons: false, stock: 'always', scanFirst: false, orderTypes: [], tableNumber: false, customerName: false },
  },
  {
    value: 'GROCERY',
    label: 'Grocery',
    summary: 'A compact list made for scanning many items quickly.',
    features: ['List instead of tiles', 'Search box stays ready for the next scan', 'Category filters'],
    switches: { layout: 'list', photos: false, categoryTabs: true, variantButtons: false, stock: 'always', scanFirst: true, orderTypes: [], tableNumber: false, customerName: false },
  },
  {
    value: 'RESTAURANT',
    label: 'Restaurant',
    summary: 'A menu by category, with dine-in, take-out, or delivery.',
    features: ['Menu tabs from your product categories', 'Big names, like a menu board', 'Table number for dine-in, on the receipt'],
    switches: { layout: 'tiles', photos: false, categoryTabs: true, variantButtons: false, stock: 'low', scanFirst: false, orderTypes: ['DINE_IN', 'TAKE_OUT', 'DELIVERY'], tableNumber: true, customerName: false },
  },
  {
    value: 'COFFEE_SHOP',
    label: 'Coffee shop',
    summary: "A menu by category, with each drink's sizes as buttons.",
    features: ['Size buttons from your variants', 'Dine-in or take-out', "Customer's name to call out, on the receipt"],
    switches: { layout: 'tiles', photos: true, categoryTabs: true, variantButtons: true, stock: 'low', scanFirst: false, orderTypes: ['DINE_IN', 'TAKE_OUT'], tableNumber: false, customerName: true },
  },
]

const ORDER_TYPES: { value: PosOrderType; label: string }[] = [
  { value: 'DINE_IN', label: 'Dine-in' },
  { value: 'TAKE_OUT', label: 'Take-out' },
  { value: 'DELIVERY', label: 'Delivery' },
]

/** What a custom template turns on, in a few words (for its card). */
function describe(custom: PosCustomTemplate): string[] {
  return [
    custom.layout === 'list' ? 'Compact list' : custom.photos ? 'Tiles with photos' : 'Tiles with big names',
    custom.categoryTabs && 'Category tabs',
    custom.variantButtons && 'Size / variant buttons',
    custom.stock === 'low' ? 'Stock shown when low' : 'Stock always shown',
    custom.scanFirst && 'Ready for the next scan',
    custom.orderTypes.length > 0 && ORDER_TYPES.filter((t) => custom.orderTypes.includes(t.value)).map((t) => t.label).join(' / '),
    custom.tableNumber && 'Table number',
    custom.customerName && "Customer's name",
  ].filter((text): text is string => !!text)
}

/** The business picks how its selling app looks: a built-in template, or its own. */
export default function PosTemplateSection() {
  const { business, can } = useBusiness()
  const settings = useLoad(() => posSettingsApi.load(business.id), [business.id])
  const [saving, setSaving] = useState<PosTemplate | null>(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState('')
  const canEdit = can('business.edit')
  const current = settings.data?.template ?? 'DEFAULT'
  const custom = settings.data?.custom

  async function save(template: PosTemplate, ownTemplate = custom) {
    setError('')
    setSaving(template)
    try {
      await posSettingsApi.save(business.id, { template, custom: ownTemplate })
      await settings.reload() // the cards change once it is saved
    } finally {
      setSaving(null)
    }
  }

  async function choose(template: BuiltIn) {
    if (template === current || saving) return
    try {
      await save(template) // your own template is kept, to switch back to later
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const cardClass = (selected: boolean) =>
    cx(
      'flex cursor-pointer flex-col gap-2 rounded-[10px] border bg-surface p-4 text-left disabled:cursor-default',
      selected ? 'border-accent ring-2 ring-accent' : 'border-line hover:enabled:border-muted',
      !canEdit && !selected && 'opacity-60',
    )
  const inUse = (value: PosTemplate) =>
    saving === value ? (
      <Spinner className="size-4" />
    ) : (
      value === current && <span className="rounded-full bg-info-soft px-2 py-0.5 text-[0.75rem] font-bold text-info">In use</span>
    )

  return (
    <section className={ui.section}>
      <div>
        <h2 className={ui.h2}>Selling app template</h2>
        <p className={ui.hint}>
          How the selling app looks for your kind of business, or make your own. Your products, prices, stock, and receipts stay the
          same; only the till changes. Sellers see it the next time they open the selling app.
        </p>
      </div>
      <ErrorBox message={settings.error || error} />
      {!settings.data ? (
        settings.error ? null : <Loading />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Selling app template">
          {BUILT_IN.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={t.value === current}
              disabled={!canEdit || saving !== null}
              onClick={() => choose(t.value)}
              className={cardClass(t.value === current)}
            >
              <span className="flex items-center justify-between gap-2">
                <strong className="text-heading">{t.label}</strong>
                {inUse(t.value)}
              </span>
              <span className="text-[0.88rem]">{t.summary}</span>
              <ul className="m-0 list-disc pl-4.5 text-[0.82rem] text-muted">
                {t.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </button>
          ))}

          <button
            type="button"
            role="radio"
            aria-checked={current === 'CUSTOM'}
            disabled={!canEdit || saving !== null}
            onClick={() => setEditing(true)}
            className={cx(cardClass(current === 'CUSTOM'), current !== 'CUSTOM' && 'border-dashed')}
          >
            <span className="flex items-center justify-between gap-2">
              <strong className="text-heading">{current === 'CUSTOM' && custom?.name ? custom.name : 'Customize your own'}</strong>
              {inUse('CUSTOM')}
            </span>
            <span className="text-[0.88rem]">
              {current === 'CUSTOM' ? 'Your own template. Tap to change it.' : 'Switch each feature on or off yourself, for any kind of business.'}
            </span>
            <ul className="m-0 list-disc pl-4.5 text-[0.82rem] text-muted">
              {(current === 'CUSTOM' && custom ? describe(custom) : ['Start from any template', 'Layout, photos, tabs, sizes', 'Order types, table, name']).map(
                (feature) => (
                  <li key={feature}>{feature}</li>
                ),
              )}
            </ul>
          </button>
        </div>
      )}
      {!canEdit && <p className={ui.hint}>Only people who can edit the business can change the template.</p>}

      {editing && settings.data && (
        <CustomTemplateForm
          start={custom ?? { name: 'My own', ...BUILT_IN[0].switches }}
          onClose={() => setEditing(false)}
          onSave={async (own) => {
            await save('CUSTOM', own)
            setEditing(false)
          }}
        />
      )}
    </section>
  )
}

function CustomTemplateForm({
  start,
  onClose,
  onSave,
}: {
  start: PosCustomTemplate
  onClose: () => void
  onSave: (custom: PosCustomTemplate) => Promise<void>
}) {
  const [form, setForm] = useState<PosCustomTemplate>(start)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (changes: Partial<PosCustomTemplate>) => setForm((old) => ({ ...old, ...changes }))
  const dineIn = form.orderTypes.includes('DINE_IN')
  const isList = form.layout === 'list'

  function toggleOrderType(type: PosOrderType) {
    const orderTypes = form.orderTypes.includes(type) ? form.orderTypes.filter((t) => t !== type) : [...form.orderTypes, type]
    // Keep the usual order: dine-in, take-out, delivery
    set({ orderTypes: ORDER_TYPES.map((t) => t.value).filter((t) => orderTypes.includes(t)) })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({ ...form, name: form.name.trim() || 'My own', tableNumber: dineIn && form.tableNumber })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Customize your own" onClose={saving ? () => {} : onClose} size="lg" closeOnBackdrop={false}>
      <form className="@container flex max-h-[calc(100dvh-2rem)] flex-col sm:max-h-[calc(100dvh-4rem)]" onSubmit={handleSubmit}>
        <header className="border-b border-line px-6 py-4 max-sm:px-4">
          <h2 className={ui.h2}>Customize your own</h2>
          <p className={ui.hint}>Switch each feature on or off. Your products, prices, and stock stay the same; only the till changes.</p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 max-sm:px-4">
          <FormSection title="Template">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 @lg:grid-cols-2">
              <label className={ui.label}>
                Name
                <input className={ui.input} value={form.name} maxLength={40} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Milk tea shop" />
              </label>
              <label className={ui.label}>
                Start from
                <select
                  className={ui.input}
                  value=""
                  onChange={(e) => {
                    const preset = BUILT_IN.find((t) => t.value === e.target.value)
                    if (preset) set(preset.switches)
                  }}
                >
                  <option value="">Copy the switches of…</option>
                  {BUILT_IN.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </FormSection>

          <FormSection title="How products look">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2" role="radiogroup" aria-label="Layout">
                <OptionCard
                  type="radio"
                  label="Tiles"
                  hint="Big buttons, good for touch screens."
                  checked={!isList}
                  onChange={() => set({ layout: 'tiles' })}
                />
                <OptionCard
                  type="radio"
                  label="List"
                  hint="Compact rows, good for many products and scanning."
                  checked={isList}
                  onChange={() => set({ layout: 'list' })}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
                <OptionCard
                  label="Product photos"
                  hint={isList ? 'Not used in the list layout.' : 'Otherwise big names, like a menu board.'}
                  checked={form.photos && !isList}
                  disabled={isList}
                  onChange={(photos) => set({ photos })}
                />
                <OptionCard
                  label="Category tabs"
                  hint="A tab per product category, like a menu."
                  checked={form.categoryTabs}
                  onChange={(categoryTabs) => set({ categoryTabs })}
                />
                <OptionCard
                  label="Size / variant buttons"
                  hint={isList ? 'Not used in the list layout.' : 'One card per product, a button per size (Small, Medium, Large).'}
                  checked={form.variantButtons && !isList}
                  disabled={isList}
                  onChange={(variantButtons) => set({ variantButtons })}
                />
                <OptionCard
                  label="Stock only when it runs low"
                  hint="Otherwise every product shows how many are left."
                  checked={form.stock === 'low'}
                  onChange={(low) => set({ stock: low ? 'low' : 'always' })}
                />
                <OptionCard
                  label="Ready for the next scan"
                  hint="After a tap or scan, the search box is ready for the next barcode."
                  checked={form.scanFirst}
                  onChange={(scanFirst) => set({ scanFirst })}
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="What the seller asks" hint="How the order is served. Leave all off for a normal shop.">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Order types">
                {ORDER_TYPES.map((type) => {
                  const on = form.orderTypes.includes(type.value)
                  return (
                    <button
                      key={type.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleOrderType(type.value)}
                      className={cx(
                        'cursor-pointer rounded-full border px-4 py-2 text-[0.9rem] font-semibold',
                        on ? 'border-accent bg-info-soft text-accent' : 'border-line bg-surface text-heading hover:border-muted',
                      )}
                    >
                      {on ? '✓ ' : '+ '}
                      {type.label}
                    </button>
                  )
                })}
              </div>
              <div className="grid grid-cols-1 gap-3 @lg:grid-cols-2">
                <OptionCard
                  label="Table number"
                  hint={dineIn ? 'Needed for dine-in orders, printed on the receipt.' : 'Turn on Dine-in to use it.'}
                  checked={dineIn && form.tableNumber}
                  disabled={!dineIn}
                  onChange={(tableNumber) => set({ tableNumber })}
                />
                <OptionCard
                  label="Customer's name"
                  hint="To call them when the order is ready, printed on the receipt."
                  checked={form.customerName}
                  onChange={(customerName) => set({ customerName })}
                />
              </div>
            </div>
          </FormSection>
        </div>

        <footer className="flex flex-col gap-2.5 rounded-b-xl border-t border-line bg-surface px-6 py-3.5 max-sm:px-4">
          <ErrorBox message={error} />
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <BusyButton type="submit" className={ui.btnPrimary} busy={saving} busyLabel="Saving…">
              Use this template
            </BusyButton>
          </div>
        </footer>
      </form>
    </Modal>
  )
}

/** A choice as a card: the whole card is clickable, and it is highlighted when on. */
function OptionCard({
  label,
  hint,
  checked,
  onChange,
  disabled = false,
  type = 'checkbox',
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  type?: 'checkbox' | 'radio'
}) {
  return (
    <label
      className={cx(
        'flex items-start gap-3 rounded-lg border px-3.5 py-3 transition-colors',
        disabled ? 'cursor-not-allowed border-line bg-page opacity-60' : 'cursor-pointer hover:border-muted',
        checked && !disabled ? 'border-accent bg-info-soft' : 'border-line',
      )}
    >
      <input
        type={type}
        className={cx(ui.checkbox, 'size-4 shrink-0')}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-semibold text-heading">{label}</span>
        <span className="text-[0.82rem] leading-snug text-muted">{hint}</span>
      </span>
    </label>
  )
}
