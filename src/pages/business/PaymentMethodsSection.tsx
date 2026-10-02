import { paymentMethodsApi } from '../../api/resources'
import type { PaymentMethod } from '../../api/types'
import { useBusiness } from '../../businessContext'
import ResourceSection from '../../components/ResourceSection'
import { Badge } from '../../components/ui'
import { labelOf } from '../../constants/options'
import * as forms from '../../forms/definitions'
import PaymentMethodForm from './PaymentMethodForm'

/** The ways this business accepts payment (shown on Business profile and on Delivery & payments: the same list). */
export default function PaymentMethodsSection() {
  const { business, can } = useBusiness()
  return (
    <ResourceSection<PaymentMethod>
      title="Payment methods"
      description="The ways you accept payment. Buyers see the types (e.g. GCash, Bank transfer) on your profile; account details are shown to a buyer only after you confirm their order."
      businessId={business.id}
      resource={paymentMethodsApi}
      sections={forms.paymentMethodSections}
      newValues={forms.newPaymentMethodValues}
      renderForm={(method, save, close) => <PaymentMethodForm key={method?.id ?? 'new'} method={method} save={save} close={close} />}
      canEdit={can('payments.manage')}
      addLabel="+ Add payment method"
      emptyText="No payment methods yet. Add the ways you accept payment, e.g. Cash, GCash, or Bank transfer."
      columns={[
        { label: 'Type', render: (m) => <strong>{labelOf(m.paymentType)}</strong> },
        { label: 'Bank / e-wallet / cards', render: (m) => m.provider || '—' },
        { label: 'Account', render: (m) => [m.accountName, m.accountNumber].filter(Boolean).join(' · ') || '—' },
        { label: 'Status', render: (m) => <Badge value={m.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
      ]}
    />
  )
}
