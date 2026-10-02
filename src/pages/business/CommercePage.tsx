import {
  deliveryApi,
  deliveryZonesApi,
  paymentTermsApi,
  returnPolicyApi,
  supplierProfileApi,
} from '../../api/resources'
import type { DeliverySettings, DeliveryZone, PaymentTerms, ReturnPolicy, SupplierProfile } from '../../api/types'
import { useBusiness } from '../../businessContext'
import ResourceSection from '../../components/ResourceSection'
import SettingsForm from '../../components/SettingsForm'
import { PageHeader, Tabs } from '../../components/ui'
import * as forms from '../../forms/definitions'
import { useTab } from '../../hooks/useTab'
import { formatMoney } from '../../utils/format'
import { ui } from '../../styles'
import DeliveryZoneForm from './DeliveryZoneForm'
import PaymentMethodsSection from './PaymentMethodsSection'

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
    <div className={ui.page}>
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
            renderForm={(zone, save, close) => <DeliveryZoneForm key={zone?.id ?? 'new'} zone={zone} save={save} close={close} />}
            canEdit={canEdit}
            addLabel="+ Add zone"
            emptyText="No zones: the standard delivery fee applies everywhere."
            columns={[
              { label: 'Area', render: (z) => [z.barangay, z.city, z.province, z.region, z.country].filter(Boolean).join(', ') },
              { label: 'Fee', num: true, render: (z) => money(z.deliveryFee) },
              { label: 'Days', num: true, render: (z) => z.estimatedDays ?? '—' },
            ]}
          />
        </>
      )}

      {tab === 'payments' && (
        <>
          <PaymentMethodsSection />
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
