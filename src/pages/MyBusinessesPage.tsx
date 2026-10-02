import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createBusiness, listMyBusinesses } from '../api/businesses'
import { listCategories } from '../api/directory'
import type { BusinessIn } from '../api/types'
import FieldForm from '../components/FieldForm'
import { BusinessCover, EmptyState, ErrorBox, Loading, PageHeader, VerifiedBadge } from '../components/ui'
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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 max-sm:grid-cols-2 max-sm:gap-3">
          {businesses.map((b) => (
            <Link
              key={b.id}
              to={`/business/${b.id}`}
              className="group flex flex-col overflow-hidden rounded-[10px] border border-line bg-surface no-underline transition hover:-translate-y-0.5 hover:border-accent hover:shadow-lg"
            >
              <BusinessCover name={b.businessName} src={b.businessLogo} />
              <div className="flex flex-1 flex-col gap-1.5 p-3.5 max-sm:p-3">
                <span className="line-clamp-2 text-[1.05rem] leading-snug font-bold text-heading group-hover:text-accent">{b.businessName}</span>
                <span className="line-clamp-1 text-[0.8rem] text-muted">{b.businessTypes.map(labelOf).join(' · ')}</span>
                <span className="mt-auto pt-1">
                  <VerifiedBadge status={b.verificationStatus} level={b.verificationLevel} />
                </span>
              </div>
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
