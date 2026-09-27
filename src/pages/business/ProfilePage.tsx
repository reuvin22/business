import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteBusiness, listMembers, updateBusiness } from '../../api/businesses'
import { listCategories } from '../../api/directory'
import { certificationsApi, contactsApi, documentsApi, legalApi, socialLinksApi } from '../../api/resources'
import type { BusinessIn, BusinessDocument, Certification, Contact, Legal, SocialLink } from '../../api/types'
import { useBusiness } from '../../businessContext'
import DetailsView from '../../components/DetailsView'
import FieldForm from '../../components/FieldForm'
import ResourceSection from '../../components/ResourceSection'
import SettingsForm from '../../components/SettingsForm'
import { Badge, ConfirmButton, ErrorBox, PageHeader, Tabs } from '../../components/ui'
import { labelOf } from '../../constants/options'
import * as forms from '../../forms/definitions'
import { useLoad } from '../../hooks/useLoad'
import { useTab } from '../../hooks/useTab'
import { formatDate } from '../../utils/format'
import { categoryOptions } from '../../utils/options'
import LocationsTab from './profile/LocationsTab'
import VerificationTab from './profile/VerificationTab'

const TABS = [
  { key: 'identity', label: 'Business info' },
  { key: 'legal', label: 'Legal & tax' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'locations', label: 'Locations & hours' },
  { key: 'online', label: 'Online presence' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'documents', label: 'Documents' },
  { key: 'verification', label: 'Verification' },
]

export default function ProfilePage() {
  const { business, can } = useBusiness()
  const [tab, setTab] = useTab(TABS)
  const canEdit = can('business.edit')

  return (
    <div className="page">
      <PageHeader title="Business profile" subtitle="Everything other businesses and the platform know about you." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'identity' && <IdentityTab />}
      {tab === 'legal' && (
        <SettingsForm<Legal>
          title="Legal & registration"
          description="Private: only your team and platform admins see this."
          businessId={business.id}
          resource={legalApi}
          sections={forms.legalSections}
          canEdit={canEdit}
        />
      )}
      {tab === 'contacts' && <ContactsTab />}
      {tab === 'locations' && <LocationsTab businessId={business.id} canEdit={canEdit} />}
      {tab === 'online' && (
        <ResourceSection<SocialLink>
          title="Social & online links"
          businessId={business.id}
          resource={socialLinksApi}
          sections={forms.socialLinkSections}
          newValues={forms.newSocialLinkValues}
          canEdit={canEdit}
          addLabel="+ Add link"
          columns={[
            { label: 'Platform', render: (l) => labelOf(l.platform) },
            { label: 'Username', render: (l) => l.username || '—' },
            {
              label: 'Link',
              render: (l) => (
                <a href={l.url} target="_blank" rel="noreferrer">
                  {l.url}
                </a>
              ),
            },
          ]}
        />
      )}
      {tab === 'certifications' && (
        <ResourceSection<Certification>
          title="Certifications"
          description="FDA, ISO, HACCP, Halal, Organic, GMP… Platform admins can mark them verified."
          businessId={business.id}
          resource={certificationsApi}
          sections={forms.certificationSections}
          canEdit={canEdit}
          addLabel="+ Add certification"
          columns={[
            { label: 'Name', render: (c) => <strong>{c.certificationName}</strong> },
            { label: 'Issued by', render: (c) => c.issuingOrganization || '—' },
            { label: 'Number', render: (c) => c.certificateNumber || '—' },
            { label: 'Expires', render: (c) => formatDate(c.expiryDate) },
            { label: 'Status', render: (c) => <Badge value={c.verificationStatus} /> },
          ]}
        />
      )}
      {tab === 'documents' && (
        <ResourceSection<BusinessDocument>
          title="Documents"
          description="Permits, certificates, IDs, contracts. Private: only your team and platform admins."
          businessId={business.id}
          resource={documentsApi}
          sections={forms.documentSections}
          newValues={forms.newDocumentValues}
          canEdit={canEdit}
          addLabel="+ Add document"
          columns={[
            { label: 'Type', render: (d) => labelOf(d.documentType) },
            {
              label: 'File',
              render: (d) => (
                <a href={d.fileUrl} target="_blank" rel="noreferrer">
                  {d.fileName || 'Open file'}
                </a>
              ),
            },
            { label: 'Expires', render: (d) => formatDate(d.expiryDate) },
            { label: 'Status', render: (d) => <Badge value={d.verificationStatus} /> },
          ]}
        />
      )}
      {tab === 'verification' && <VerificationTab />}
    </div>
  )
}

function IdentityTab() {
  const { business, role, can, reload } = useBusiness()
  const navigate = useNavigate()
  const { data: categories = [] } = useLoad(listCategories, [])
  const [editing, setEditing] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const sections = forms.businessSections(categoryOptions(categories))

  if (editing) {
    return (
      <FieldForm
        title="Edit business info"
        sections={sections}
        initial={business}
        submitLabel="Save changes"
        onCancel={() => setEditing(false)}
        onSubmit={async (values) => {
          await updateBusiness(business.id, { ...business, ...values } as BusinessIn)
          setEditing(false)
          reload()
        }}
      />
    )
  }

  return (
    <>
      <div className="section-head">
        <div className="identity-summary">
          {business.coverImage && <img src={business.coverImage} alt="" className="cover-image" />}
          <p className="hint">
            Status <Badge value={business.businessStatus} /> · Verification <Badge value={business.verificationStatus} />
          </p>
        </div>
        {can('business.edit') && (
          <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>
            Edit business info
          </button>
        )}
      </div>
      <DetailsView sections={sections} values={business} />

      {role.role === 'OWNER' && (
        <section className="card details-card danger-zone">
          <h3>Danger zone</h3>
          <ErrorBox message={deleteError} />
          <div className="form-actions">
            <span className="confirm-text">
              Deleting removes this business and all its products, stock, and settings. Orders and messages with other
              businesses are kept for them.
            </span>
            <ConfirmButton
              label="Delete business"
              confirmLabel="Yes, delete permanently"
              onConfirm={async () => {
                try {
                  await deleteBusiness(business.id)
                  navigate('/dashboard/business', { replace: true })
                } catch (err) {
                  setDeleteError((err as Error).message)
                }
              }}
            />
          </div>
        </section>
      )}
    </>
  )
}

function ContactsTab() {
  const { business, can } = useBusiness()
  const { data: members = [] } = useLoad(() => listMembers(business.id), [business.id])
  const memberOptions = members.map((m) => ({ value: m.id, label: m.displayName || m.email }))

  return (
    <ResourceSection<Contact>
      title="Contacts"
      description="Who other businesses should talk to, e.g. Purchasing → Maria, Sales → John."
      businessId={business.id}
      resource={contactsApi}
      sections={forms.contactSections(memberOptions)}
      newValues={forms.newContactValues}
      canEdit={can('business.edit')}
      addLabel="+ Add contact"
      columns={[
        {
          label: 'Name',
          render: (c) => (
            <strong>
              {c.firstName} {c.lastName} {c.isPrimary && '★'}
            </strong>
          ),
        },
        { label: 'Position', render: (c) => labelOf(c.position) },
        { label: 'Email', render: (c) => c.email || '—' },
        { label: 'Phone', render: (c) => c.phone || '—' },
        { label: 'Public', render: (c) => (c.showOnProfile ? 'Yes' : 'No') },
        { label: 'Verified', render: (c) => (c.isVerified ? <Badge value="VERIFIED" /> : '') },
      ]}
    />
  )
}
