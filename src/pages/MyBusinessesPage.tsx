import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { acceptInvitation, createBusiness, declineInvitation, listMyBusinesses, listMyInvitations } from '../api/businesses'
import { listCategories } from '../api/directory'
import type { BusinessIn, Invitation } from '../api/types'
import FieldForm from '../components/FieldForm'
import { BusinessCover, BusyButton, EmptyState, ErrorBox, Loading, PageHeader, VerifiedBadge } from '../components/ui'
import { labelOf } from '../constants/options'
import { businessSections, newBusinessValues } from '../forms/definitions'
import { useLoad } from '../hooks/useLoad'
import { categoryOptions } from '../utils/options'
import { cx, ui } from '../styles'

export default function MyBusinessesPage() {
  const navigate = useNavigate()
  const { data: businesses, loading, error, reload } = useLoad(listMyBusinesses, [])
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

      <MyInvitations onJoined={reload} />

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
            text="You don't belong to a business yet. Create one, or ask a business owner to invite you to their team."
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

/** Teams that invited you. Nobody is added to a team without saying yes here. */
function MyInvitations({ onJoined }: { onJoined: () => void }) {
  const { data: invitations, reload } = useLoad(listMyInvitations, [])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  if (!invitations?.length) return null

  async function answer(invitation: Invitation, accept: boolean) {
    setError('')
    setBusy(`${invitation.id}:${accept}`)
    try {
      if (accept) await acceptInvitation(invitation.id)
      else await declineInvitation(invitation.id)
      reload()
      if (accept) onJoined()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy('')
    }
  }

  return (
    <section className={cx(ui.card, 'flex flex-col gap-3')}>
      <h2 className={ui.h2}>Invitations</h2>
      <ErrorBox message={error} />
      {invitations.map((invitation) => (
        <div key={invitation.id} className="flex flex-wrap items-center gap-3 border-t border-line pt-3 first-of-type:border-t-0 first-of-type:pt-0">
          <div className="min-w-0 flex-1">
            <strong className="text-heading">{invitation.businessName}</strong>
            <p className={cx(ui.hint, 'm-0')}>
              {invitation.invitedByName || 'Someone'} invited you as {invitation.role === 'SELLER' ? 'a seller (selling app)' : labelOf(invitation.role)}.
              Only accept if you know this business.
            </p>
          </div>
          <BusyButton className={ui.btnGhost} busy={busy === `${invitation.id}:false`} disabled={!!busy} onClick={() => answer(invitation, false)}>
            Decline
          </BusyButton>
          <BusyButton className={ui.btnPrimary} busy={busy === `${invitation.id}:true`} disabled={!!busy} onClick={() => answer(invitation, true)}>
            Accept
          </BusyButton>
        </div>
      ))}
    </section>
  )
}

