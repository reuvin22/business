import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createBusiness, listMyBusinesses } from '../api/businesses'
import { listCategories } from '../api/directory'
import type { BusinessIn } from '../api/types'
import FieldForm from '../components/FieldForm'
import { EmptyState, ErrorBox, Loading, PageHeader, VerifiedBadge } from '../components/ui'
import { labelOf } from '../constants/options'
import { businessSections, newBusinessValues } from '../forms/definitions'
import { useLoad } from '../hooks/useLoad'
import { categoryOptions } from '../utils/options'
import { initials } from '../utils/format'

export default function MyBusinessesPage() {
  const navigate = useNavigate()
  const { data: businesses, loading, error } = useLoad(listMyBusinesses, [])
  const { data: categories = [] } = useLoad(listCategories, [])
  const [showForm, setShowForm] = useState(false)

  const openForm = () => setShowForm(true)

  return (
    <div className="page">
      <PageHeader
        title="My businesses"
        subtitle="Businesses you own or are a team member of."
        actions={
          !showForm &&
          !!businesses?.length && (
            <button type="button" className="btn btn-primary btn-auto" onClick={openForm}>
              + Create business
            </button>
          )
        }
      />

      {showForm && (
        <FieldForm
          title="Create your business"
          sections={businessSections(categoryOptions(categories))}
          initial={newBusinessValues}
          submitLabel="Create business"
          onCancel={() => setShowForm(false)}
          onSubmit={async (values) => {
            const business = await createBusiness(values as BusinessIn)
            navigate(`/business/${business.id}/profile`)
          }}
        />
      )}

      <ErrorBox message={error} />
      {loading ? (
        <Loading />
      ) : businesses?.length ? (
        <div className="business-grid">
          {businesses.map((b) => (
            <Link key={b.id} to={`/business/${b.id}`} className="business-card">
              {b.businessLogo ? (
                <img src={b.businessLogo} alt="" className="business-logo" />
              ) : (
                <span className="business-logo business-logo-fallback">{initials(b.businessName)}</span>
              )}
              <span className="business-card-name">{b.businessName}</span>
              <span className="business-card-meta">{b.businessTypes.map(labelOf).join(' · ')}</span>
              <VerifiedBadge status={b.verificationStatus} level={b.verificationLevel} />
            </Link>
          ))}
        </div>
      ) : (
        !showForm && (
          <EmptyState
            text="You don't belong to a business yet. Create one, or ask a business owner to add you to their team."
            action={
              <button type="button" className="btn btn-primary btn-auto" onClick={openForm}>
                + Create your first business
              </button>
            }
          />
        )
      )}
    </div>
  )
}
