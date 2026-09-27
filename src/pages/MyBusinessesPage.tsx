import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createBusiness, listMyBusinesses } from '../api/businesses'
import { listCategories } from '../api/directory'
import type { BusinessIn } from '../api/types'
import FieldForm from '../components/FieldForm'
import { BusinessLogo, EmptyState, ErrorBox, Loading, PageHeader, VerifiedBadge } from '../components/ui'
import { labelOf } from '../constants/options'
import { businessSections, newBusinessValues } from '../forms/definitions'
import { useLoad } from '../hooks/useLoad'
import { categoryOptions } from '../utils/options'
import { ui } from '../styles'

export default function MyBusinessesPage() {
  const navigate = useNavigate()
  const { data: businesses, loading, error } = useLoad(listMyBusinesses, [])
  const { data: categories = [] } = useLoad(listCategories, [])
  const [showForm, setShowForm] = useState(false)

  const openForm = () => setShowForm(true)

  return (
    <div className={ui.page}>
      <PageHeader
        title="My businesses"
        subtitle="Businesses you own or are a team member of."
        actions={
          !showForm &&
          !!businesses?.length && (
            <button type="button" className={ui.btnPrimary} onClick={openForm}>
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
          {businesses.map((b) => (
            <Link key={b.id} to={`/business/${b.id}`} className="flex min-h-45 flex-col items-center justify-center gap-2 rounded-[10px] border border-line bg-surface px-4 py-5 text-center no-underline transition hover:-translate-y-0.75 hover:border-accent hover:shadow-xl">
              <BusinessLogo name={b.businessName} src={b.businessLogo} />
              <span className="text-[1.2rem] font-bold wrap-break-word text-heading">{b.businessName}</span>
              <span className="text-[0.8rem] text-muted">{b.businessTypes.map(labelOf).join(' · ')}</span>
              <VerifiedBadge status={b.verificationStatus} level={b.verificationLevel} />
            </Link>
          ))}
        </div>
      ) : (
        !showForm && (
          <EmptyState
            text="You don't belong to a business yet. Create one, or ask a business owner to add you to their team."
            action={
              <button type="button" className={ui.btnPrimary} onClick={openForm}>
                + Create your first business
              </button>
            }
          />
        )
      )}
    </div>
  )
}
