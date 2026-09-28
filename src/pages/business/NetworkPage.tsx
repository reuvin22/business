import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { searchBusinesses } from '../../api/directory'
import * as network from '../../api/network'
import type { RelationshipView } from '../../api/types'
import { useBusiness } from '../../businessContext'
import ReviewCard from '../../components/ReviewCard'
import { Badge, BusyButton, ConfirmButton, EmptyState, ErrorBox, Loading, PageHeader, Stars, Tabs } from '../../components/ui'
import { labelOf, RELATIONSHIP_TYPES } from '../../constants/options'
import { useBusy, useRunning } from '../../hooks/useBusy'
import { useLoad } from '../../hooks/useLoad'
import { useTab } from '../../hooks/useTab'
import { formatDateTime } from '../../utils/format'
import { cx, ui } from '../../styles'

const TABS = [
  { key: 'relationships', label: 'Relationships' },
  { key: 'reviews', label: 'Reviews about us' },
]

export default function NetworkPage() {
  const [tab, setTab] = useTab(TABS)
  return (
    <div className={ui.page}>
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
  const [running, run] = useRunning()
  const canEdit = can('relationships.manage')

  async function act(name: string, action: () => Promise<unknown>) {
    setActionError('')
    await run(name, async () => {
      try {
        await action()
        reload()
      } catch (err) {
        setActionError((err as Error).message)
      }
    })
  }

  const incoming = relationships?.filter((r) => r.direction === 'INCOMING' && r.status === 'PENDING') ?? []
  const others = relationships?.filter((r) => !incoming.includes(r)) ?? []

  return (
    <>
      <div className={ui.sectionHead}>
        <p className={ui.hint}>A relationship says what another business is to you, e.g. “Acme is our supplier”. They must accept it.</p>
        {canEdit && !adding && (
          <button type="button" className={ui.btnPrimary} onClick={() => setAdding(true)}>
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
        <section className={ui.section}>
          <h2 className={ui.h2}>Requests waiting for you</h2>
          {incoming.map((r) => (
            <div key={r.id} className={cx(ui.card, 'flex flex-wrap items-center justify-between gap-3 px-4.5 py-4')}>
              <span>
                <strong>{r.otherBusinessName}</strong> wants to add you — they would be your <strong>{labelOf(r.theirRole).toLowerCase()}</strong>.
                {r.notes && <span className={ui.hint}> “{r.notes}”</span>}
              </span>
              {canEdit && (
                <span className="flex gap-2">
                  <BusyButton
                    className={ui.btnPrimary}
                    busy={running === `${r.id}:accept`}
                    disabled={running !== ''}
                    onClick={() => act(`${r.id}:accept`, () => network.respondToRelationship(business.id, r.id, true))}
                  >
                    Accept
                  </BusyButton>
                  <BusyButton
                    className={ui.btnGhost}
                    busy={running === `${r.id}:decline`}
                    disabled={running !== ''}
                    onClick={() => act(`${r.id}:decline`, () => network.respondToRelationship(business.id, r.id, false))}
                  >
                    Decline
                  </BusyButton>
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
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>Business</th>
                  <th className={ui.th}>They are your</th>
                  <th className={ui.th}>Status</th>
                  <th className={ui.th}>Since</th>
                  <th className={ui.th}>Notes</th>
                  {canEdit && <th className={ui.th} aria-label="Actions" />}
                </tr>
              </thead>
              <tbody>
                {others.map((r) => (
                  <RelationshipRow key={r.id} relationship={r} canEdit={canEdit} onEnd={() => act(`${r.id}:end`, () => network.endRelationship(business.id, r.id))} />
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
      <td className={cx(ui.td, ui.strong)}>
        <Link to={`/dashboard/directory/${r.otherBusinessId}`} className={ui.rowLink}>
          {r.otherBusinessName}
        </Link>
      </td>
      <td className={ui.td}>{labelOf(r.theirRole)}</td>
      <td className={ui.td}>
        <Badge value={r.status} />
        {r.status === 'PENDING' && <span className={ui.hint}> waiting for them</span>}
      </td>
      <td className={ui.td}>{formatDateTime(r.startedAt)}</td>
      <td className={cx(ui.td, ui.wrap)}>{r.notes || '—'}</td>
      {canEdit && (
        <td className={cx(ui.td, ui.actions)}>
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
  const [saving, runSave] = useBusy()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!otherId) return setError('Choose a business.')
    await runSave(async () => {
      try {
        await network.requestRelationship(business.id, { relatedBusinessId: otherId, relationshipType: type, notes })
        onDone()
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <form className={ui.formCard} onSubmit={handleSubmit}>
      <h2 className={ui.h2}>Add relationship</h2>
      <div className={ui.formGrid}>
        <label className={ui.label}>
          Business *
          <select className={ui.input} value={otherId} onChange={(e) => setOtherId(e.target.value)} autoFocus>
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
        <label className={ui.label}>
          They are our *
          <select className={ui.input} value={type} onChange={(e) => setType(e.target.value)}>
            {RELATIONSHIP_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className={cx(ui.label, 'col-span-full')}>
          Notes
          <input className={ui.input} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Supplies our soft drinks since 2020" />
        </label>
      </div>
      <ErrorBox message={error} />
      <div className={ui.formActions}>
        <button type="button" className={ui.btnGhost} onClick={onDone}>
          Cancel
        </button>
        <BusyButton type="submit" className={ui.btnPrimary} busy={saving} busyLabel="Sending…">
          Send request
        </BusyButton>
      </div>
    </form>
  )
}

function ReviewsTab() {
  const { business, can } = useBusiness()
  const { data: reviews, error, reload } = useLoad(() => network.listMyReviews(business.id), [business.id])

  return (
    <section className={ui.section}>
      <p className={ui.hint}>
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
