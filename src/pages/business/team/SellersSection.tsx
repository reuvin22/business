import { useState, type FormEvent } from 'react'
import { createSeller, listSellers, removeSeller, setSellerPassword, updateSeller } from '../../../api/businesses'
import { locationsApi } from '../../../api/resources'
import type { Location, Member } from '../../../api/types'
import { useBusiness } from '../../../businessContext'
import { Badge, BusyButton, ConfirmButton, EmptyState, ErrorBox, Loading } from '../../../components/ui'
import { MEMBER_STATUSES } from '../../../constants/options'
import { useBusy } from '../../../hooks/useBusy'
import { useLoad } from '../../../hooks/useLoad'
import { cx, ui } from '../../../styles'
import { formatDateTime } from '../../../utils/format'

// Where the selling app (my-business-pos) is deployed, so you can send sellers the link
const POS_URL = import.meta.env.VITE_POS_URL as string | undefined

type Editing = { seller: Member; mode: 'details' | 'password' }

/** Seller accounts: people who only use the selling app. The business creates their login. */
export default function SellersSection() {
  const { business, can } = useBusiness()
  const sellers = useLoad(() => listSellers(business.id), [business.id])
  const { data: locations = [] } = useLoad(() => locationsApi.list(business.id), [business.id])
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Editing | null>(null)
  const [actionError, setActionError] = useState('')
  const canManage = can('members.manage')

  const storeName = (id: string | null | undefined) =>
    id ? (locations.find((l) => l.id === id)?.locationName ?? 'Deleted location') : 'Any location'

  async function remove(seller: Member) {
    setActionError('')
    try {
      await removeSeller(business.id, seller.id)
      sellers.reload()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  return (
    <section className={ui.section}>
      <div className={ui.sectionHead}>
        <div>
          <h2 className={ui.h2}>Sellers</h2>
          <p className={ui.hint}>
            Accounts for the selling app. Sellers sell your products at the counter and receive stock; every sale
            updates your inventory right away. They cannot open this app.
            {POS_URL && (
              <>
                {' '}
                Selling app:{' '}
                <a href={POS_URL} target="_blank" rel="noreferrer" className={ui.link}>
                  {POS_URL}
                </a>
              </>
            )}
          </p>
        </div>
        {canManage && !adding && (
          <button type="button" className={ui.btnPrimary} onClick={() => setAdding(true)}>
            + Create seller account
          </button>
        )}
      </div>

      {adding && (
        <CreateSellerForm
          locations={locations}
          onCancel={() => setAdding(false)}
          onCreated={() => {
            setAdding(false)
            sellers.reload()
          }}
        />
      )}
      {editing?.mode === 'details' && (
        <EditSellerForm
          key={editing.seller.id}
          seller={editing.seller}
          locations={locations}
          onDone={() => {
            setEditing(null)
            sellers.reload()
          }}
        />
      )}
      {editing?.mode === 'password' && (
        <PasswordForm key={editing.seller.id} seller={editing.seller} onDone={() => setEditing(null)} />
      )}

      <ErrorBox message={sellers.error || actionError} />
      {!sellers.data ? (
        <Loading />
      ) : sellers.data.length === 0 ? (
        !adding && <EmptyState text="No seller accounts yet." />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>Seller</th>
                <th className={ui.th}>Store</th>
                <th className={ui.th}>Status</th>
                <th className={ui.th}>Created</th>
                {canManage && <th className={ui.th} aria-label="Actions" />}
              </tr>
            </thead>
            <tbody>
              {sellers.data.map((s) => (
                <tr key={s.id}>
                  <td className={cx(ui.td, ui.strong)}>
                    {s.displayName || s.email}
                    <div className="text-[0.82rem] text-muted">{s.email}</div>
                  </td>
                  <td className={ui.td}>{storeName(s.locationId)}</td>
                  <td className={ui.td}>
                    <Badge value={s.status} />
                  </td>
                  <td className={ui.td}>{formatDateTime(s.joinedAt)}</td>
                  {canManage && (
                    <td className={cx(ui.td, ui.actions)}>
                      <button type="button" className={ui.link} onClick={() => setEditing({ seller: s, mode: 'details' })}>
                        Edit
                      </button>
                      <button type="button" className={ui.link} onClick={() => setEditing({ seller: s, mode: 'password' })}>
                        New password
                      </button>
                      <ConfirmButton label="Remove" onConfirm={() => remove(s)} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function StoreSelect({ locations, value, onChange }: { locations: Location[]; value: string; onChange: (id: string) => void }) {
  return (
    <label className={ui.label}>
      Store
      <select className={ui.input} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Any location (they choose)</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.locationName}
          </option>
        ))}
      </select>
    </label>
  )
}

function CreateSellerForm({
  locations,
  onCancel,
  onCreated,
}: {
  locations: Location[]
  onCancel: () => void
  onCreated: () => void
}) {
  const { business } = useBusiness()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [locationId, setLocationId] = useState(locations.find((l) => l.isPrimary)?.id ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createSeller(business.id, { displayName, email, password, locationId: locationId || null })
      onCreated()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={ui.formCard} onSubmit={handleSubmit}>
      <h2 className={ui.h2}>Create a seller account</h2>
      <p className={ui.hint}>
        Give the seller this email and password; they sign in to the selling app with it. If the email already has an
        account, that account is used and keeps its own password.
      </p>
      <div className={ui.formGrid}>
        <label className={ui.label}>
          Name *
          <input className={ui.input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ana Santos" autoFocus />
        </label>
        <label className={ui.label}>
          Email *
          <input className={ui.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ana@email.com" />
        </label>
        <label className={ui.label}>
          Password * (6+ characters)
          <input className={ui.input} type="text" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <StoreSelect locations={locations} value={locationId} onChange={setLocationId} />
      </div>
      <ErrorBox message={error} />
      <div className={ui.formActions}>
        <button type="button" className={ui.btnGhost} onClick={onCancel}>
          Cancel
        </button>
        <BusyButton type="submit" className={ui.btnPrimary} disabled={!displayName.trim() || !email.trim() || password.length < 6} busy={saving} busyLabel="Creating…">
          Create account
        </BusyButton>
      </div>
    </form>
  )
}

function EditSellerForm({ seller, locations, onDone }: { seller: Member; locations: Location[]; onDone: () => void }) {
  const { business } = useBusiness()
  const [displayName, setDisplayName] = useState(seller.displayName)
  const [locationId, setLocationId] = useState(seller.locationId ?? '')
  const [status, setStatus] = useState(seller.status)
  const [error, setError] = useState('')
  const [saving, run] = useBusy()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    await run(async () => {
      try {
        await updateSeller(business.id, seller.id, { displayName, locationId: locationId || null, status })
        onDone()
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <form className={ui.formCard} onSubmit={handleSubmit}>
      <h2 className={ui.h2}>Edit {seller.displayName || seller.email}</h2>
      <div className={ui.formGrid}>
        <label className={ui.label}>
          Name *
          <input className={ui.input} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <StoreSelect locations={locations} value={locationId} onChange={setLocationId} />
        <label className={ui.label}>
          Status
          <select className={ui.input} value={status} onChange={(e) => setStatus(e.target.value)}>
            {MEMBER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className={ui.hint}>A suspended seller cannot sign in to the selling app until you make them active again.</p>
      <ErrorBox message={error} />
      <div className={ui.formActions}>
        <button type="button" className={ui.btnGhost} onClick={onDone}>
          Cancel
        </button>
        <BusyButton type="submit" className={ui.btnPrimary} disabled={!displayName.trim()} busy={saving} busyLabel="Saving…">
          Save changes
        </BusyButton>
      </div>
    </form>
  )
}

function PasswordForm({ seller, onDone }: { seller: Member; onDone: () => void }) {
  const { business } = useBusiness()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, run] = useBusy()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    await run(async () => {
      try {
        await setSellerPassword(business.id, seller.id, password)
        setSaved(true)
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <form className={ui.formCard} onSubmit={handleSubmit}>
      <h2 className={ui.h2}>New password for {seller.displayName || seller.email}</h2>
      {saved ? (
        <p className={ui.alertInfo}>Password changed. Give the seller the new password.</p>
      ) : (
        <div className={ui.formGrid}>
          <label className={ui.label}>
            New password * (6+ characters)
            <input className={ui.input} type="text" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </label>
        </div>
      )}
      <ErrorBox message={error} />
      <div className={ui.formActions}>
        <button type="button" className={ui.btnGhost} onClick={onDone}>
          {saved ? 'Close' : 'Cancel'}
        </button>
        {!saved && (
          <BusyButton type="submit" className={ui.btnPrimary} disabled={password.length < 6} busy={saving} busyLabel="Saving…">
            Set password
          </BusyButton>
        )}
      </div>
    </form>
  )
}
