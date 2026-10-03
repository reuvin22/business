import { useState, type ReactNode } from 'react'
import type { Location, PublicProfile } from '../../api/types'
import { DetailItem, DetailsCard, DetailsGrid } from '../../components/DetailsView'
import PdfViewer from '../../components/PdfViewer'
import { Badge, Modal } from '../../components/ui'
import { labelOf, SUPPLIER_CAPABILITIES } from '../../constants/options'
import { formatDate, formatMoney } from '../../utils/format'
import { groupHours, isOpenNow } from '../../utils/hours'
import { cx, ui } from '../../styles'

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
        <LocationCard key={l.id} location={l} />
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
        <DetailItem label="Accepts" wide>
          {profile.paymentTypes.length > 0 ? (
            <span className="mt-1 flex flex-wrap gap-1.5">
              {(profile.acceptedPayments ?? profile.paymentTypes.map((paymentType) => ({ paymentType, providers: [] }))).map((accepted) => (
                <span key={accepted.paymentType} className={ui.chip}>
                  {labelOf(accepted.paymentType)}
                  {accepted.providers.length > 0 && <span className="font-normal"> · {accepted.providers.join(', ')}</span>}
                </span>
              ))}
            </span>
          ) : (
            <span className="text-muted">No payment methods listed yet. Ask the business when you order.</span>
          )}
        </DetailItem>
        <Item label="Terms" value={paymentTerms.paymentTerms.map(labelOf).join(', ')} wide />
        <Item label="Down payment" value={paymentTerms.downPaymentPercentage !== null ? `${paymentTerms.downPaymentPercentage}%` : ''} />
        <Item label="Credit days" value={paymentTerms.creditDays !== null ? String(paymentTerms.creditDays) : ''} />
        <Item label="Notes" value={paymentTerms.notes} wide />
      </Card>

      <Card title="Returns">
        <Item label="Returns" value={returnPolicy.returnAllowed ? `Accepted within ${returnPolicy.returnPeriodDays ?? '?'} days` : 'Not accepted'} />
        <Item label="Refund" value={returnPolicy.refundMethod ? labelOf(returnPolicy.refundMethod) : ''} />
        <Item label="Replacement" value={returnPolicy.replacementAvailable ? 'Available' : ''} />
        {(returnPolicy.policyDescription || returnPolicy.policyFileUrl) && (
          <DetailItem label="Full policy" wide>
            <FullPolicyButton policy={returnPolicy} businessName={business.businessName} />
          </DetailItem>
        )}
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

/** A location: its address (with a map link), phone, and opening hours day by day. */
function LocationCard({ location: l }: { location: Location }) {
  const address = [l.addressLine1, l.addressLine2, l.barangay, l.city, l.province].filter(Boolean).join(', ')
  const mapQuery = l.latitude !== null && l.longitude !== null ? `${l.latitude},${l.longitude}` : [address, l.country].filter(Boolean).join(', ')
  const groups = groupHours(l.operatingHours)
  const open = isOpenNow(l.operatingHours)

  return (
    <section className={cx(ui.card, 'flex flex-col gap-4 px-6 py-5.5')}>
      <div>
        <h3 className={cx(ui.h3, 'mb-0.5')}>{l.locationName}</h3>
        <span className="text-[0.85rem] text-muted">
          {labelOf(l.locationType)}
          {l.isPrimary && ' · Main location'}
        </span>
      </div>

      {address && (
        <div className="flex items-start gap-2.5">
          <PinIcon />
          <div className="min-w-0">
            <p className="m-0 leading-snug text-heading">{address}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
              target="_blank"
              rel="noreferrer"
              className="text-[0.85rem] font-semibold text-accent"
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      )}

      {l.contactPhone && (
        <div className="flex items-center gap-2.5">
          <PhoneIcon />
          <a href={`tel:${l.contactPhone.replace(/\s/g, '')}`} className="text-heading no-underline hover:underline">
            {l.contactPhone}
          </a>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <ClockIcon />
          <span className="font-semibold text-heading">Opening hours</span>
          {open !== null && (
            <span
              className={cx(
                'ml-auto rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold',
                open ? 'bg-info-soft text-info' : 'bg-danger-soft text-danger',
              )}
            >
              {open ? 'Open now' : 'Closed now'}
            </span>
          )}
        </div>
        {open === null ? (
          <p className="m-0 pl-7 text-muted">Not set</p>
        ) : (
          <dl className="m-0 flex flex-col gap-1 pl-7 text-[0.9rem]">
            {groups.map((g) => (
              <div
                key={g.days}
                className={cx('flex justify-between gap-4 rounded-md px-2 py-1', g.today && 'bg-chip font-semibold text-heading')}
              >
                <dt className={g.today ? 'text-heading' : 'text-muted'}>
                  {g.days}
                  {g.today && ' (today)'}
                </dt>
                <dd className={cx('m-0 text-right tabular-nums', g.closed ? 'text-muted' : 'text-heading')}>{g.time}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  )
}

const iconClass = 'mt-0.5 size-4.5 shrink-0 text-muted'

function PinIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function PhoneIcon() {
  return (
    <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className={cx(iconClass, 'mt-0')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

/** The full return policy, read in a dialog: the text and/or the PDF (shown inside the app). */
function FullPolicyButton({ policy, businessName }: { policy: PublicProfile['returnPolicy']; businessName: string }) {
  const [open, setOpen] = useState(false)
  const title = `${businessName} · Return policy`
  const text = policy.policyDescription && <p className="m-0 whitespace-pre-line text-heading">{policy.policyDescription}</p>
  return (
    <>
      <button type="button" className={cx(ui.btnGhost, 'mt-1 px-3 py-1.5')} onClick={() => setOpen(true)}>
        View full policy
      </button>
      {open &&
        (policy.policyFileUrl ? (
          <PdfViewer url={policy.policyFileUrl} title={title} onClose={() => setOpen(false)}>
            {text}
          </PdfViewer>
        ) : (
          <Modal title={title} onClose={() => setOpen(false)} size="md">
            <div className="flex flex-col gap-4 p-6 max-sm:p-4">
              <h2 className={ui.h2}>{title}</h2>
              {text}
              <div className="flex justify-end">
                <button type="button" className={ui.btnPrimary} onClick={() => setOpen(false)} autoFocus>
                  Close
                </button>
              </div>
            </div>
          </Modal>
        ))}
    </>
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
