import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicProfile, listPublicProducts, listPublicReviews } from '../../api/directory'
import { endRelationship, listRelationships, requestRelationship, respondToRelationship } from '../../api/network'
import type { RelationshipView } from '../../api/types'
import ReviewCard from '../../components/ReviewCard'
import { BusinessLogo, BusyButton, ConfirmButton, EmptyState, ErrorBox, Loading, Spinner, Stars, Tabs, VerifiedBadge } from '../../components/ui'
import { labelOf, RELATIONSHIP_TYPES } from '../../constants/options'
import { useActingBusiness } from '../../hooks/useActingBusiness'
import { useOnActivity } from '../../hooks/useActivity'
import { useBusy } from '../../hooks/useBusy'
import { useLoad } from '../../hooks/useLoad'
import { useTab } from '../../hooks/useTab'
import AboutPanel from './AboutPanel'
import OrderPanel from './OrderPanel'
import { cx, ui } from '../../styles'

const TABS = [
  { key: 'products', label: 'Products & ordering' },
  { key: 'about', label: 'About' },
  { key: 'reviews', label: 'Reviews' },
]

export default function PublicProfilePage() {
  const { businessId = '' } = useParams()
  const [tab, setTab] = useTab(TABS)
  const { myBusinesses, acting, choose } = useActingBusiness()
  const profile = useLoad(() => getPublicProfile(businessId), [businessId])
  const products = useLoad(() => listPublicProducts(businessId, acting?.id), [businessId, acting?.id])
  const reviews = useLoad(() => listPublicReviews(businessId), [businessId])

  const backLink = (
    <Link to="/dashboard/directory" className={ui.backLink}>
      ← Directory
    </Link>
  )
  if (!profile.data) return <div className={ui.page}>{backLink}{profile.error ? <ErrorBox message={profile.error} /> : <Loading />}</div>

  const business = profile.data.business
  const isMine = myBusinesses.some((b) => b.id === businessId)

  return (
    <div className={ui.page}>
      {backLink}

      <header className={cx(ui.card, 'overflow-hidden p-0 max-sm:p-0')}>
        <div className="flex flex-wrap items-start gap-4.5 px-6 py-5.5">
          <BusinessLogo name={business.businessName} src={business.businessLogo} />
          <div className="flex min-w-60 flex-1 flex-col gap-1.5">
            <h1 className={ui.h1}>{business.businessName}</h1>
            <p className="text-muted">
              {business.businessTypes.map(labelOf).join(' · ')}
              {business.primaryCity && ` · ${business.primaryCity}${business.primaryProvince ? `, ${business.primaryProvince}` : ''}`}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Stars rating={business.ratingAverage} count={business.ratingCount} />
              <VerifiedBadge status={business.verificationStatus} level={business.verificationLevel} />
            </div>
            {business.businessDescription && <p className="whitespace-pre-line">{business.businessDescription}</p>}
          </div>
        </div>
      </header>

      {isMine ? (
        <p className={ui.alertInfo}>
          This is your business. <Link to={`/business/${businessId}`}>Manage it here.</Link>
        </p>
      ) : acting ? (
        <div className={cx(ui.card, 'flex flex-wrap items-center gap-3.5 px-4 py-3.5')}>
          <label className={ui.inlineLabel}>
            Acting as
            <select className={ui.inputAuto} value={acting.id} onChange={(e) => choose(e.target.value)}>
              {myBusinesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.businessName}
                </option>
              ))}
            </select>
          </label>
          <Link to={`/business/${acting.id}/messages?to=${businessId}`} className={ui.btnGhost}>
            Message
          </Link>
          <Connection key={acting.id} fromBusinessId={acting.id} toBusinessId={businessId} businessName={business.businessName} />
        </div>
      ) : (
        <p className={ui.alertInfo}>
          <Link to="/dashboard/business">Create a business</Link> to order, message, or connect with {business.businessName}.
        </p>
      )}

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'products' &&
        (!products.data ? (
          products.error ? <ErrorBox message={products.error} /> : <Loading />
        ) : (
          <OrderPanel key={acting?.id} profile={profile.data} products={products.data} buyer={isMine ? null : acting} />
        ))}

      {tab === 'about' && <AboutPanel profile={profile.data} />}

      {tab === 'reviews' &&
        (!reviews.data ? (
          <Loading />
        ) : reviews.data.length === 0 ? (
          <EmptyState text="No reviews yet." />
        ) : (
          reviews.data.map((review) => <ReviewCard key={review.id} review={review} />)
        ))}
    </div>
  )
}

type ConnectionProps = { fromBusinessId: string; toBusinessId: string; businessName: string }

/** Where you stand with this business: connected (withdraw), a request waiting, or the form to connect. */
function Connection({ fromBusinessId, toBusinessId, businessName }: ConnectionProps) {
  // Fresh: when they accept on their side, opening this page shows it straight away
  const relationships = useLoad(() => listRelationships(fromBusinessId, { fresh: true }), [fromBusinessId])
  // Live: when they accept, decline, or withdraw, this changes by itself
  useOnActivity(fromBusinessId, ['CONNECTIONS'], () => relationships.reload())
  const [error, setError] = useState('')
  const [busy, run] = useBusy()

  if (!relationships.data) {
    return relationships.error ? <span className="text-[0.85rem] text-danger">{relationships.error}</span> : <Spinner />
  }
  const open = relationships.data.filter(
    (r) => r.otherBusinessId === toBusinessId && (r.status === 'ACTIVE' || r.status === 'PENDING'),
  )
  if (open.length === 0) return <ConnectForm fromBusinessId={fromBusinessId} toBusinessId={toBusinessId} onSent={relationships.reload} />

  async function act(change: () => Promise<unknown>) {
    setError('')
    try {
      await change()
      await relationships.reload() // keep the button busy until the new status shows
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {open.map((r) => (
        <ConnectionRow
          key={r.id}
          relationship={r}
          businessName={businessName}
          busy={busy}
          onRespond={(accept) => run(() => act(() => respondToRelationship(fromBusinessId, r.id, accept)))}
          onWithdraw={() => act(() => endRelationship(fromBusinessId, r.id))}
        />
      ))}
      {error && <span className="text-[0.85rem] text-danger">{error}</span>}
    </div>
  )
}

function ConnectionRow({
  relationship: r,
  businessName,
  busy,
  onRespond,
  onWithdraw,
}: {
  relationship: RelationshipView
  businessName: string
  busy: boolean
  onRespond: (accept: boolean) => void
  onWithdraw: () => Promise<unknown>
}) {
  const role = labelOf(r.theirRole).toLowerCase()

  if (r.status === 'ACTIVE') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-info-soft px-3 py-1.5 text-[0.9rem] font-semibold text-info">
          <span aria-hidden="true">✓</span> You are now connected with {businessName}
        </span>
        <span className={ui.hint}>They are your {role}.</span>
        <ConfirmButton label="Withdraw" confirmLabel="Withdraw connection" onConfirm={onWithdraw} />
      </div>
    )
  }

  if (r.direction === 'OUTGOING') {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-warn-soft px-3 py-1.5 text-[0.9rem] font-semibold text-warn">Request sent</span>
        <span className={ui.hint}>
          Waiting for {businessName} to accept. You asked to add them as your {role}.
        </span>
        <ConfirmButton label="Withdraw request" confirmLabel="Withdraw request" onConfirm={onWithdraw} />
      </div>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className={ui.hint}>
        {businessName} wants to connect, as your {role}.
      </span>
      <BusyButton className={ui.btnPrimary} busy={busy} onClick={() => onRespond(true)}>
        Accept
      </BusyButton>
      <button type="button" className={ui.btnGhost} disabled={busy} onClick={() => onRespond(false)}>
        Decline
      </button>
    </div>
  )
}

/** "Add as ... " — ask the other business to connect. */
function ConnectForm({
  fromBusinessId,
  toBusinessId,
  onSent,
}: {
  fromBusinessId: string
  toBusinessId: string
  onSent: () => Promise<unknown>
}) {
  const [type, setType] = useState('SUPPLIER')
  const [error, setError] = useState('')
  const [saving, run] = useBusy()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    await run(async () => {
      try {
        await requestRelationship(fromBusinessId, { relatedBusinessId: toBusinessId, relationshipType: type, notes: '' })
        await onSent() // shows "Request sent" with a withdraw button
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <form className="flex flex-wrap items-center gap-2.5" onSubmit={handleSubmit}>
      <label className={ui.inlineLabel}>
        Add them as our
        <select className={ui.inputAuto} value={type} onChange={(e) => setType(e.target.value)}>
          {RELATIONSHIP_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <BusyButton type="submit" className={ui.btnGhost} busy={saving}>
        Connect
      </BusyButton>
      {error && <span className="text-[0.85rem] text-danger">{error}</span>}
    </form>
  )
}
