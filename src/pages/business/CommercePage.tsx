import {
  deliveryApi,
  deliveryZonesApi,
  paymentMethodsApi,
  paymentTermsApi,
  returnPolicyApi,
  supplierProfileApi,
} from '../../api/resources'
import type { DeliverySettings, DeliveryZone, PaymentMethod, PaymentTerms, ReturnPolicy, SupplierProfile } from '../../api/types'
import { useBusiness } from '../../businessContext'
import ResourceSection from '../../components/ResourceSection'
import SettingsForm from '../../components/SettingsForm'
import { Badge, PageHeader, Tabs } from '../../components/ui'
import { labelOf } from '../../constants/options'
import * as forms from '../../forms/definitions'
import { useTab } from '../../hooks/useTab'
import { formatMoney } from '../../utils/format'

const TABS = [
  { key: 'delivery', label: 'Delivery' },
  { key: 'payments', label: 'Payments' },
  { key: 'returns', label: 'Returns' },
  { key: 'supplier', label: 'Supplier capabilities' },
]

export default function CommercePage() {
  const { business, can, reload } = useBusiness()
  const [tab, setTab] = useTab(TABS)
  const canEdit = can('business.edit')
  const canEditPayments = can('payments.manage')
  const money = (n: number | null) => formatMoney(n, business.currency)

  return (
    <div className="page">
      <PageHeader title="Delivery & payments" subtitle="How buyers receive and pay for orders. Shown on your public profile." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'delivery' && (
        <>
          <SettingsForm<DeliverySettings>
            title="Delivery options"
            businessId={business.id}
            resource={deliveryApi}
            sections={forms.deliverySections}
            canEdit={canEdit}
          />
          <ResourceSection<DeliveryZone>
            title="Delivery zones"
            description="Different fees per area. If you add zones, you only deliver to areas that match one."
            businessId={business.id}
            resource={deliveryZonesApi}
            sections={forms.deliveryZoneSections}
            newValues={forms.newDeliveryZoneValues}
            canEdit={canEdit}
            addLabel="+ Add zone"
            emptyText="No zones: the standard delivery fee applies everywhere."
            columns={[
              { label: 'Area', render: (z) => [z.barangay, z.city, z.province, z.region].filter(Boolean).join(', ') },
              { label: 'Fee', className: 'num', render: (z) => money(z.deliveryFee) },
              { label: 'Days', className: 'num', render: (z) => z.estimatedDays ?? '—' },
            ]}
          />
        </>
      )}

      {tab === 'payments' && (
        <>
          <ResourceSection<PaymentMethod>
            title="Payment methods"
            description="Buyers see only the types you accept. Account details are shown to a buyer after you confirm their order."
            businessId={business.id}
            resource={paymentMethodsApi}
            sections={forms.paymentMethodSections}
            newValues={forms.newPaymentMethodValues}
            canEdit={canEditPayments}
            addLabel="+ Add payment method"
            columns={[
              { label: 'Type', render: (m) => <strong>{labelOf(m.paymentType)}</strong> },
              { label: 'Provider', render: (m) => m.provider || '—' },
              { label: 'Account', render: (m) => [m.accountName, m.accountNumber].filter(Boolean).join(' · ') || '—' },
              { label: 'Status', render: (m) => <Badge value={m.isActive ? 'ACTIVE' : 'INACTIVE'} /> },
            ]}
          />
          <SettingsForm<PaymentTerms>
            title="Payment terms"
            description="e.g. COD, 50% down payment, Net 30."
            businessId={business.id}
            resource={paymentTermsApi}
            sections={forms.paymentTermsSections}
            canEdit={canEditPayments}
          />
        </>
      )}

      {tab === 'returns' && (
        <SettingsForm<ReturnPolicy>
          title="Return policy"
          businessId={business.id}
          resource={returnPolicyApi}
          sections={forms.returnPolicySections}
          canEdit={canEdit}
        />
      )}

      {tab === 'supplier' && (
        <SettingsForm<SupplierProfile>
          title="Supplier capabilities"
          description="Retailers can filter the directory by these."
          businessId={business.id}
          resource={supplierProfileApi}
          sections={forms.supplierProfileSections}
          canEdit={canEdit}
          onSaved={reload}
        />
      )}
    </div>
  )
}
