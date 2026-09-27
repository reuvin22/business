import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { searchBusinesses } from '../../api/directory'
import * as network from '../../api/network'
import type { RelationshipView } from '../../api/types'
import { useBusiness } from '../../businessContext'
import ReviewCard from '../../components/ReviewCard'
import { Badge, ConfirmButton, EmptyState, ErrorBox, Loading, PageHeader, Stars, Tabs } from '../../components/ui'
import { labelOf, RELATIONSHIP_TYPES } from '../../constants/options'
import { useLoad } from '../../hooks/useLoad'
import { useTab } from '../../hooks/useTab'
import { formatDateTime } from '../../utils/format'

const TABS = [
  { key: 'relationships', label: 'Relationships' },
  { key: 'reviews', label: 'Reviews about us' },
]

export default function NetworkPage() {
  const [tab, setTab] = useTab(TABS)
  return (
    <div className="page">
      <PageHeader title="Network" subtitle="Your suppliers, customers, distributors, and partners — and what they say about you." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'relationships' ? <RelationshipsTab /> : <ReviewsTab />}
    </div>
  )
}

function RelationshipsTab() {
  const { business, can } = useBusiness()
  const { data: relationships, error, reload } = useLoad(() => network.listRelationships(business.id), [business.id])
  const [adding, setAdding] = useState(false)
  const [actionError, setActionError] = useState('')
  const canEdit = can('relationships.manage')

  async function act(action: () => Promise<unknown>) {
    setActionError('')
    try {
      await action()
      reload()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  const incoming = relationships?.filter((r) => r.direction === 'INCOMING' && r.status === 'PENDING') ?? []
  const others = relationships?.filter((r) => !incoming.includes(r)) ?? []

  return (
    <>
      <div className="section-head">
        <p className="hint">A relationship says what another business is to you, e.g. “Acme is our supplier”. They must accept it.</p>
        {canEdit && !adding && (
          <button type="button" className="btn btn-primary btn-auto" onClick={() => setAdding(true)}>
            + Add relationship
          </button>
        )}
      </div>
      {adding && (
        <RelationshipForm
          onDone={() => {
            setAdding(false)
            reload()
          }}
        />
      )}
      <ErrorBox message={error || actionError} />

      {incoming.length > 0 && (
        <section className="resource-section">
          <h2>Requests waiting for you</h2>
          {incoming.map((r) => (
            <div key={r.id} className="card request-card">
              <span>
                <strong>{r.otherBusinessName}</strong> wants to add you — they would be your <strong>{labelOf(r.theirRole).toLowerCase()}</strong>.
                {r.notes && <span className="hint"> “{r.notes}”</span>}
              </span>
              {canEdit && (
                <span className="actions">
                  <button type="button" className="btn btn-primary btn-auto" onClick={() => act(() => network.respondToRelationship(business.id, r.id, true))}>
                    Accept
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => act(() => network.respondToRelationship(business.id, r.id, false))}>
                    Decline
                  </button>
                </span>
              )}
            </div>
          ))}
        </section>
      )}

      {!relationships ? (
        <Loading />
      ) : others.length === 0 && incoming.length === 0 ? (
        !adding && <EmptyState text="No relationships yet." />
      ) : (
        others.length > 0 && (
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>They are your</th>
                  <th>Status</th>
                  <th>Since</th>
                  <th>Notes</th>
                  {canEdit && <th aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {others.map((r) => (
                  <RelationshipRow key={r.id} relationship={r} canEdit={canEdit} onEnd={() => act(() => network.endRelationship(business.id, r.id))} />
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </>
  )
}

function RelationshipRow({ relationship: r, canEdit, onEnd }: { relationship: RelationshipView; canEdit: boolean; onEnd: () => void }) {
  const open = r.status === 'ACTIVE' || r.status === 'PENDING'
  return (
    <tr>
      <td className="strong">
        <Link to={`/dashboard/directory/${r.otherBusinessId}`} className="row-link">
          {r.otherBusinessName}
        </Link>
      </td>
      <td>{labelOf(r.theirRole)}</td>
      <td>
        <Badge value={r.status} />
        {r.status === 'PENDING' && <span className="hint"> waiting for them</span>}
      </td>
      <td>{formatDateTime(r.startedAt)}</td>
      <td className="wrap">{r.notes || '—'}</td>
      {canEdit && (
        <td className="actions">
          {open && <ConfirmButton label={r.status === 'PENDING' ? 'Cancel request' : 'End'} onConfirm={onEnd} />}
        </td>
      )}
    </tr>
  )
}

function RelationshipForm({ onDone }: { onDone: () => void }) {
  const { business } = useBusiness()
  const { data: businesses = [] } = useLoad(() => searchBusinesses({}), [])
  const [otherId, setOtherId] = useState('')
  const [type, setType] = useState('SUPPLIER')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!otherId) return setError('Choose a business.')
    try {
      await network.requestRelationship(business.id, { relatedBusinessId: otherId, relationshipType: type, notes })
      onDone()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form className="card form-card" onSubmit={handleSubmit}>
      <h2>Add relationship</h2>
      <div className="form-grid">
        <label>
          Business *
          <select value={otherId} onChange={(e) => setOtherId(e.target.value)} autoFocus>
            <option value="">Select…</option>
            {businesses
              .filter((b) => b.id !== business.id)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.businessName}
                  {b.primaryCity && ` — ${b.primaryCity}`}
                </option>
              ))}
          </select>
        </label>
        <label>
          They are our *
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {RELATIONSHIP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="span-all">
          Notes
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Supplies our soft drinks since 2020" />
        </label>
      </div>
      <ErrorBox message={error} />
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary btn-auto">
          Send request
        </button>
      </div>
    </form>
  )
}

function ReviewsTab() {
  const { business, can } = useBusiness()
  const { data: reviews, error, reload } = useLoad(() => network.listMyReviews(business.id), [business.id])

  return (
    <section className="resource-section">
      <p className="hint">
        Average <Stars rating={business.ratingAverage} count={business.ratingCount} />. Only buyers with a completed order can review you.
      </p>
      <ErrorBox message={error} />
      {!reviews ? (
        <Loading />
      ) : reviews.length === 0 ? (
        <EmptyState text="No reviews yet." />
      ) : (
        reviews.map((review) => (
          <ReviewCard key={review.id} review={review} respondAsBusinessId={can('business.edit') ? business.id : undefined} onResponded={reload} />
        ))
      )}
    </section>
  )
}
