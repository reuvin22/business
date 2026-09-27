import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicProfile, listPublicProducts, listPublicReviews } from '../../api/directory'
import { requestRelationship } from '../../api/network'
import ReviewCard from '../../components/ReviewCard'
import { EmptyState, ErrorBox, Loading, Stars, Tabs, VerifiedBadge } from '../../components/ui'
import { labelOf, RELATIONSHIP_TYPES } from '../../constants/options'
import { useActingBusiness } from '../../hooks/useActingBusiness'
import { useLoad } from '../../hooks/useLoad'
import { useTab } from '../../hooks/useTab'
import { initials } from '../../utils/format'
import AboutPanel from './AboutPanel'
import OrderPanel from './OrderPanel'

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
    <Link to="/dashboard/directory" className="back-link">
      ← Directory
    </Link>
  )
  if (!profile.data) return <div className="page">{backLink}{profile.error ? <ErrorBox message={profile.error} /> : <Loading />}</div>

  const business = profile.data.business
  const isMine = myBusinesses.some((b) => b.id === businessId)

  return (
    <div className="page">
      {backLink}

      <header className="profile-hero card">
        {business.coverImage && <img src={business.coverImage} alt="" className="profile-cover" />}
        <div className="profile-hero-body">
          {business.businessLogo ? (
            <img src={business.businessLogo} alt="" className="business-logo" />
          ) : (
            <span className="business-logo business-logo-fallback">{initials(business.businessName)}</span>
          )}
          <div className="profile-hero-text">
            <h1>{business.businessName}</h1>
            <p className="muted">
              {business.businessTypes.map(labelOf).join(' · ')}
              {business.primaryCity && ` · ${business.primaryCity}${business.primaryProvince ? `, ${business.primaryProvince}` : ''}`}
            </p>
            <div className="profile-badges">
              <Stars rating={business.ratingAverage} count={business.ratingCount} />
              <VerifiedBadge status={business.verificationStatus} level={business.verificationLevel} />
            </div>
            {business.businessDescription && <p className="pre-line">{business.businessDescription}</p>}
          </div>
        </div>
      </header>

      {isMine ? (
        <p className="alert alert-info">
          This is your business. <Link to={`/business/${businessId}`}>Manage it here.</Link>
        </p>
      ) : acting ? (
        <div className="card acting-bar">
          <label>
            Acting as
            <select value={acting.id} onChange={(e) => choose(e.target.value)}>
              {myBusinesses.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.businessName}
                </option>
              ))}
            </select>
          </label>
          <Link to={`/business/${acting.id}/messages?to=${businessId}`} className="btn btn-ghost">
            Message
          </Link>
          <ConnectForm fromBusinessId={acting.id} toBusinessId={businessId} />
        </div>
      ) : (
        <p className="alert alert-info">
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await requestRelationship(fromBusinessId, { relatedBusinessId: toBusinessId, relationshipType: type, notes: '' })
      setMessage('Request sent. They will see it on their Network page.')
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form className="connect-form" onSubmit={handleSubmit}>
      <label>
        Add them as our
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {RELATIONSHIP_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn-ghost">
        Connect
      </button>
      {message && <span className="hint">{message}</span>}
      {error && <span className="error-text">{error}</span>}
    </form>
  )
}
