import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicProfile, listPublicProducts, listPublicReviews } from '../../api/directory'
import { requestRelationship } from '../../api/network'
import ReviewCard from '../../components/ReviewCard'
import { BusinessLogo, BusyButton, EmptyState, ErrorBox, Loading, Stars, Tabs, VerifiedBadge } from '../../components/ui'
import { labelOf, RELATIONSHIP_TYPES } from '../../constants/options'
import { useActingBusiness } from '../../hooks/useActingBusiness'
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
        {business.coverImage && <img src={business.coverImage} alt="" className="block h-47.5 w-full object-cover" />}
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
          <ConnectForm fromBusinessId={acting.id} toBusinessId={businessId} />
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

/** "Add as ... " — ask the other business to connect. */
function ConnectForm({ fromBusinessId, toBusinessId }: { fromBusinessId: string; toBusinessId: string }) {
  const [type, setType] = useState('SUPPLIER')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, run] = useBusy()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    await run(async () => {
      try {
        await requestRelationship(fromBusinessId, { relatedBusinessId: toBusinessId, relationshipType: type, notes: '' })
        setMessage('Request sent. They will see it on their Network page.')
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
      {message && <span className={ui.hint}>{message}</span>}
      {error && <span className="text-[0.85rem] text-danger">{error}</span>}
    </form>
  )
}
