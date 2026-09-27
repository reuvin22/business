import type { ReactNode } from 'react'
import type { PublicProfile } from '../../api/types'
import { DetailItem, DetailsCard, DetailsGrid } from '../../components/DetailsView'
import { Badge } from '../../components/ui'
import { labelOf, SUPPLIER_CAPABILITIES } from '../../constants/options'
import { formatDate, formatMoney } from '../../utils/format'
import { hoursSummary } from '../../utils/hours'
import { ui } from '../../styles'

/** Everything public about a business, in cards. */
export default function AboutPanel({ profile }: { profile: PublicProfile }) {
  const { business, delivery, paymentTerms, returnPolicy } = profile
  const money = (n: number | null) => formatMoney(n, business.currency)
  const capabilities = SUPPLIER_CAPABILITIES.filter((c) => profile.supplierProfile[c.value])

  return (
    <DetailsGrid>
      <Card title="Business">
        <Item label="Legal name" value={business.legalName} />
        <Item label="Industry" value={business.industry} />
        <Item label="Established" value={business.yearEstablished ? String(business.yearEstablished) : ''} />
        <Item label="Size" value={business.businessSize ? labelOf(business.businessSize) : ''} />
        <Item label="Email" value={business.primaryEmail} />
        <Item label="Phone" value={business.primaryPhone} />
        {business.website && (
          <DetailItem label="Website" wide>
            <a href={business.website} target="_blank" rel="noreferrer">
              {business.website}
            </a>
          </DetailItem>
        )}
      </Card>

      {capabilities.length > 0 && (
        <Card title="Supplier capabilities">
          <div className="col-span-full flex flex-wrap gap-1.5">
            {capabilities.map((c) => (
              <span key={c.value} className={ui.chip}>
                ✓ {c.label}
              </span>
            ))}
          </div>
        </Card>
      )}

      {profile.locations.map((l) => (
        <Card key={l.id} title={`${l.locationName} · ${labelOf(l.locationType)}`}>
          <Item label="Address" value={[l.addressLine1, l.barangay, l.city, l.province].filter(Boolean).join(', ')} wide />
          <Item label="Hours" value={hoursSummary(l.operatingHours)} wide />
          <Item label="Phone" value={l.contactPhone} />
        </Card>
      ))}

      {profile.contacts.length > 0 && (
        <Card title="Contacts">
          {profile.contacts.map((c) => (
            <Item
              key={c.id}
              label={labelOf(c.position)}
              value={[`${c.firstName} ${c.lastName}`.trim(), c.email, c.phone].filter(Boolean).join(' · ')}
              wide
            />
          ))}
        </Card>
      )}

      <Card title="Delivery">
        <Item
          label="Options"
          value={[delivery.pickupAvailable && 'Pickup', delivery.deliveryAvailable && 'Delivery', delivery.shippingAvailable && 'Shipping']
            .filter(Boolean)
            .join(', ')}
          wide
        />
        <Item label="Delivery fee" value={delivery.deliveryFee !== null ? money(delivery.deliveryFee) : ''} />
        <Item label="Free from" value={delivery.freeDeliveryThreshold !== null ? money(delivery.freeDeliveryThreshold) : ''} />
        <Item label="Minimum for delivery" value={delivery.minimumOrderForDelivery !== null ? money(delivery.minimumOrderForDelivery) : ''} />
        <Item label="Delivery time" value={delivery.estimatedDeliveryDays !== null ? `${delivery.estimatedDeliveryDays} days` : ''} />
        {profile.deliveryZones.length > 0 && (
          <Item
            label="Zones"
            value={profile.deliveryZones.map((z) => `${[z.barangay, z.city, z.province, z.region].filter(Boolean).join(', ')}: ${money(z.deliveryFee)}`).join(' · ')}
            wide
          />
        )}
        <Item label="Notes" value={delivery.deliveryNotes} wide />
      </Card>

      <Card title="Payment">
        <Item label="Accepts" value={profile.paymentTypes.map(labelOf).join(', ')} wide />
        <Item label="Terms" value={paymentTerms.paymentTerms.map(labelOf).join(', ')} wide />
        <Item label="Down payment" value={paymentTerms.downPaymentPercentage !== null ? `${paymentTerms.downPaymentPercentage}%` : ''} />
        <Item label="Credit days" value={paymentTerms.creditDays !== null ? String(paymentTerms.creditDays) : ''} />
        <Item label="Notes" value={paymentTerms.notes} wide />
      </Card>

      <Card title="Returns">
        <Item label="Returns" value={returnPolicy.returnAllowed ? `Accepted within ${returnPolicy.returnPeriodDays ?? '?'} days` : 'Not accepted'} />
        <Item label="Refund" value={returnPolicy.refundMethod ? labelOf(returnPolicy.refundMethod) : ''} />
        <Item label="Replacement" value={returnPolicy.replacementAvailable ? 'Available' : ''} />
        <Item label="Policy" value={returnPolicy.policyDescription} wide />
      </Card>

      {profile.certifications.length > 0 && (
        <Card title="Certifications">
          {profile.certifications.map((c) => (
            <div key={c.id} className="col-span-full py-1">
              <strong>{c.certificationName}</strong> <Badge value={c.verificationStatus} />
              <span className="block text-[0.82rem] text-muted">
                {[c.issuingOrganization, c.certificateNumber, c.expiryDate && `expires ${formatDate(c.expiryDate)}`].filter(Boolean).join(' · ')}
              </span>
            </div>
          ))}
        </Card>
      )}

      {(profile.socialLinks.length > 0 || profile.brands.length > 0) && (
        <Card title="Brands & online">
          <Item label="Brands" value={profile.brands.map((b) => b.brandName).join(', ')} wide />
          {profile.socialLinks.map((s) => (
            <DetailItem key={s.id} label={labelOf(s.platform)}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.username || s.url}
              </a>
            </DetailItem>
          ))}
        </Card>
      )}
    </DetailsGrid>
  )
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <DetailsCard title={title}>{children}</DetailsCard>
}

/** A label + value row. Hidden when there is no value. */
function Item({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  if (!value) return null
  return (
    <DetailItem label={label} wide={wide}>
      {value}
    </DetailItem>
  )
}
