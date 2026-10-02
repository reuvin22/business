import { useId, useState, type FormEvent } from 'react'
import type { PaymentMethod } from '../../api/types'
import { FormSection } from '../../components/FieldForm'
import { BusyButton, ErrorBox, Modal } from '../../components/ui'
import { PAYMENT_TYPES } from '../../constants/options'
import { cx, ui } from '../../styles'

// What each kind of payment asks for. The type is the kind (bank transfer, e-wallet, card...);
// the provider says which one (BDO, GCash, Visa...). Suggestions can be picked or typed over.
type Kind = { provider?: { label: string; placeholder: string; suggestions?: string[]; choices?: string[] }; account?: { number: string } }

const KINDS: Record<string, Kind> = {
  BANK_TRANSFER: {
    provider: {
      label: 'Bank',
      placeholder: 'Type or pick a bank',
      suggestions: [
        'BDO', 'BPI', 'Metrobank', 'Land Bank', 'PNB', 'Security Bank', 'UnionBank', 'RCBC', 'China Bank',
        'EastWest Bank', 'PSBank', 'AUB', 'Maybank', 'CIMB', 'DBP', 'GoTyme', 'Maya Bank', 'SeaBank', 'Tonik',
      ],
    },
    account: { number: 'Account number' },
  },
  E_WALLET: {
    provider: { label: 'E-wallet', placeholder: 'Type or pick an e-wallet', suggestions: ['GCash', 'Maya', 'GrabPay', 'ShopeePay', 'Coins.ph', 'PalawanPay'] },
    account: { number: 'Mobile number' },
  },
  CARD: {
    provider: { label: 'Cards accepted', placeholder: '', choices: ['Credit and debit cards', 'Credit cards', 'Debit cards'] },
  },
  ONLINE_PAYMENT: {
    provider: { label: 'Service', placeholder: 'e.g. PayMongo, Xendit, PayPal', suggestions: ['PayMongo', 'Xendit', 'PayPal', 'Dragonpay'] },
  },
}

const INSTRUCTIONS_PLACEHOLDER: Record<string, string> = {
  BANK_TRANSFER: 'e.g. Send the deposit slip in Messages after paying.',
  E_WALLET: 'e.g. Send a screenshot of the receipt in Messages.',
  CARD: 'e.g. Visa and Mastercard; we send a payment link after confirming.',
  CASH: 'e.g. Pay at the counter on pickup.',
  COD: 'e.g. Exact amount please; the rider has limited change.',
  CHEQUE: 'e.g. Payable to Acme Supplies Inc., dated on delivery.',
  CREDIT_TERMS: 'e.g. For approved customers only.',
}

type Values = Pick<PaymentMethod, 'paymentType' | 'provider' | 'accountName' | 'accountNumber' | 'instructions' | 'isActive'>

/** A way this business accepts payment. The fields follow the type: a bank for transfers, an e-wallet, the cards... */
export default function PaymentMethodForm({
  method,
  save,
  close,
}: {
  method: PaymentMethod | null
  save: (body: unknown) => Promise<void>
  close: () => void
}) {
  const [values, setValues] = useState<Values>({
    paymentType: method?.paymentType ?? 'BANK_TRANSFER',
    provider: method?.provider ?? '',
    accountName: method?.accountName ?? '',
    accountNumber: method?.accountNumber ?? '',
    instructions: method?.instructions ?? '',
    isActive: method?.isActive ?? true,
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const listId = useId()
  const kind = KINDS[values.paymentType] ?? {}
  const set = (changes: Partial<Values>) => setValues((old) => ({ ...old, ...changes }))

  function changeType(paymentType: string) {
    // Another kind: its provider list is different, so start the provider again
    set({ paymentType, provider: paymentType === 'CARD' ? KINDS.CARD.provider!.choices![0] : '' })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const missing = [
      kind.provider && !values.provider.trim() && values.paymentType !== 'ONLINE_PAYMENT' && kind.provider.label,
      kind.account && !values.accountNumber.trim() && kind.account.number,
    ].filter(Boolean)
    if (missing.length) return setError(`Please fill in: ${missing.join(', ')}.`)
    setError('')
    setSaving(true)
    try {
      // Only what this kind uses is saved (no bank account on a cash method)
      await save({
        ...(method ?? {}),
        paymentType: values.paymentType,
        provider: kind.provider ? values.provider.trim() : '',
        accountName: kind.account ? values.accountName.trim() : '',
        accountNumber: kind.account ? values.accountNumber.trim() : '',
        instructions: values.instructions.trim(),
        isActive: values.isActive,
      })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={method ? 'Edit payment method' : 'Add payment method'} onClose={saving ? () => {} : close} size="md" closeOnBackdrop={false}>
      <form className="@container flex max-h-[calc(100dvh-2rem)] flex-col sm:max-h-[calc(100dvh-4rem)]" onSubmit={handleSubmit} noValidate>
        <header className="border-b border-line px-6 py-4 max-sm:px-4">
          <h2 className={ui.h2}>{method ? 'Edit payment method' : 'Add payment method'}</h2>
          <p className={ui.hint}>Account details are private. A buyer only sees them after you confirm their order.</p>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-5 max-sm:px-4">
          <FormSection title="Payment method">
            <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 @lg:grid-cols-2">
              <label className={ui.label}>
                Type *
                <select className={ui.input} value={values.paymentType} onChange={(e) => changeType(e.target.value)} autoFocus>
                  {PAYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>

              {kind.provider && (
                <label className={ui.label}>
                  {kind.provider.label}
                  {values.paymentType !== 'ONLINE_PAYMENT' && ' *'}
                  {kind.provider.choices ? (
                    <select className={ui.input} value={values.provider} onChange={(e) => set({ provider: e.target.value })}>
                      {kind.provider.choices.map((choice) => (
                        <option key={choice}>{choice}</option>
                      ))}
                    </select>
                  ) : (
                    <>
                      <input
                        className={ui.input}
                        value={values.provider}
                        onChange={(e) => set({ provider: e.target.value })}
                        placeholder={kind.provider.placeholder}
                        list={listId}
                        autoComplete="off"
                      />
                      <datalist id={listId}>
                        {kind.provider.suggestions?.map((name) => (
                          <option key={name} value={name} />
                        ))}
                      </datalist>
                    </>
                  )}
                </label>
              )}

              {kind.account && (
                <>
                  <label className={ui.label}>
                    Account name
                    <input className={ui.input} value={values.accountName} onChange={(e) => set({ accountName: e.target.value })} placeholder="e.g. Acme Supplies Inc." />
                  </label>
                  <label className={ui.label}>
                    {kind.account.number} *
                    <input
                      className={ui.input}
                      value={values.accountNumber}
                      onChange={(e) => set({ accountNumber: e.target.value })}
                      inputMode={values.paymentType === 'E_WALLET' ? 'tel' : 'numeric'}
                      placeholder={values.paymentType === 'E_WALLET' ? '09XX XXX XXXX' : ''}
                    />
                  </label>
                </>
              )}

              <label className={cx(ui.label, 'col-span-full')}>
                Instructions
                <textarea
                  className={cx(ui.input, 'min-h-20 resize-y')}
                  value={values.instructions}
                  onChange={(e) => set({ instructions: e.target.value })}
                  placeholder={INSTRUCTIONS_PLACEHOLDER[values.paymentType] ?? ''}
                />
              </label>

              <label className={cx(ui.checkboxLabel, 'col-span-full')}>
                <input type="checkbox" className={ui.checkbox} checked={values.isActive} onChange={(e) => set({ isActive: e.target.checked })} />
                <span>
                  Active <span className={ui.hint}>(buyers can choose it)</span>
                </span>
              </label>
            </div>
          </FormSection>
        </div>

        <footer className="flex flex-col gap-2.5 rounded-b-xl border-t border-line bg-surface px-6 py-3.5 max-sm:px-4">
          <ErrorBox message={error} />
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            <button type="button" className={ui.btnGhost} onClick={close} disabled={saving}>
              Cancel
            </button>
            <BusyButton type="submit" className={ui.btnPrimary} busy={saving} busyLabel="Saving…">
              {method ? 'Save changes' : 'Add'}
            </BusyButton>
          </div>
        </footer>
      </form>
    </Modal>
  )
}
