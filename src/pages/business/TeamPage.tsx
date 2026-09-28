import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { addMember, listMembers, removeMember, updateMember } from '../../api/businesses'
import type { Member } from '../../api/types'
import { useBusiness } from '../../businessContext'
import { Badge, ConfirmButton, ErrorBox, Loading, PageHeader } from '../../components/ui'
import { labelOf, MEMBER_ROLES, MEMBER_STATUSES, PERMISSIONS, ROLE_PERMISSIONS } from '../../constants/options'
import { useLoad } from '../../hooks/useLoad'
import { useAuth } from '../../useAuth'
import { formatDateTime } from '../../utils/format'
import { cx, ui } from '../../styles'
import SellersSection from './team/SellersSection'

export default function TeamPage() {
  const { business, role, can } = useBusiness()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: members, error, reload } = useLoad(() => listMembers(business.id), [business.id])
  const [editing, setEditing] = useState<Member | null>(null)
  const [actionError, setActionError] = useState('')
  const canManage = can('members.manage')

  async function remove(member: Member) {
    setActionError('')
    try {
      await removeMember(business.id, member.id)
      if (member.id === user?.uid) navigate('/dashboard/business', { replace: true })
      else reload()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  return (
    <div className={ui.page}>
      <PageHeader title="Team" subtitle="People who can work on this business, and what each of them may change." />

      {canManage && <AddMemberForm onAdded={reload} />}
      {editing && (
        <EditMemberForm
          key={editing.id}
          member={editing}
          onDone={() => {
            setEditing(null)
            reload()
          }}
        />
      )}

      <ErrorBox message={error || actionError} />
      {!members ? (
        <Loading />
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>Member</th>
                <th className={ui.th}>Role</th>
                <th className={ui.th}>Can change</th>
                <th className={ui.th}>Status</th>
                <th className={ui.th}>Joined</th>
                <th className={ui.th} aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {members
                .filter((m) => m.role !== 'SELLER') // sellers have their own section below
                .map((m) => {
                const isMe = m.id === user?.uid
                const isOwner = m.role === 'OWNER'
                return (
                  <tr key={m.id}>
                    <td className={cx(ui.td, ui.strong)}>
                      {m.displayName || m.email}
                      {isMe && ' (you)'}
                      <div className="text-[0.82rem] text-muted">{m.email}</div>
                    </td>
                    <td className={ui.td}>{labelOf(m.role)}</td>
                    <td className={cx(ui.td, ui.wrap, ui.small)}>
                      {isOwner ? 'Everything' : m.permissions.map((p) => PERMISSIONS.find((o) => o.value === p)?.label ?? p).join(', ') || 'View only'}
                    </td>
                    <td className={ui.td}>
                      <Badge value={m.status} />
                    </td>
                    <td className={ui.td}>{formatDateTime(m.joinedAt)}</td>
                    <td className={cx(ui.td, ui.actions)}>
                      {canManage && !isOwner && !isMe && (
                        <button type="button" className={ui.link} onClick={() => setEditing(m)}>
                          Edit
                        </button>
                      )}
                      {!isOwner && (canManage || isMe) && (
                        <ConfirmButton label={isMe ? 'Leave business' : 'Remove'} onConfirm={() => remove(m)} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {role.role === 'OWNER' && <p className={ui.hint}>You are the owner. Owners cannot leave the business; they can only delete it (Profile → Business info).</p>}

      <SellersSection />
    </div>
  )
}

function AddMemberForm({ onAdded }: { onAdded: () => void }) {
  const { business } = useBusiness()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('STAFF')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      const member = await addMember(business.id, { email, role })
      setMessage(`${member.displayName || member.email} was added as ${labelOf(member.role)}.`)
      setEmail('')
      onAdded()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form className={ui.formCard} onSubmit={handleSubmit}>
      <h2 className={ui.h2}>Add a team member</h2>
      <p className={ui.hint}>They need to have signed up already. They get the default permissions for their role; you can change them after.</p>
      <div className={ui.formGrid}>
        <label className={ui.label}>
          Email *
          <input className={ui.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@email.com" />
        </label>
        <label className={ui.label}>
          Role *
          <select className={ui.input} value={role} onChange={(e) => setRole(e.target.value)}>
            {MEMBER_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message && <p className={ui.alertInfo}>{message}</p>}
      <ErrorBox message={error} />
      <div className={ui.formActions}>
        <button type="submit" className={ui.btnPrimary} disabled={!email.trim()}>
          Add member
        </button>
      </div>
    </form>
  )
}

function EditMemberForm({ member, onDone }: { member: Member; onDone: () => void }) {
  const { business } = useBusiness()
  const [role, setRole] = useState(member.role)
  const [permissions, setPermissions] = useState<string[]>(member.permissions)
  const [status, setStatus] = useState(member.status)
  const [error, setError] = useState('')

  const togglePermission = (p: string) =>
    setPermissions((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await updateMember(business.id, member.id, { role, permissions, status })
      onDone()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form className={ui.formCard} onSubmit={handleSubmit}>
      <h2 className={ui.h2}>Edit {member.displayName || member.email}</h2>
      <div className={ui.formGrid}>
        <label className={ui.label}>
          Role
          <select className={ui.input}
            value={role}
            onChange={(e) => {
              setRole(e.target.value)
              setPermissions(ROLE_PERMISSIONS[e.target.value] ?? [])
            }}
          >
            {MEMBER_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
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
      <div className="flex flex-col gap-2">
        <span className="text-[0.88rem] font-semibold text-heading">Permissions (changing the role resets these to its defaults)</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-x-4 gap-y-2">
          {PERMISSIONS.map((p) => (
            <label key={p.value} className={ui.checkboxLabel}>
              <input type="checkbox" className={ui.checkbox} checked={permissions.includes(p.value)} onChange={() => togglePermission(p.value)} />
              <span>{p.label}</span>
            </label>
          ))}
        </div>
      </div>
      <ErrorBox message={error} />
      <div className={ui.formActions}>
        <button type="button" className={ui.btnGhost} onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className={ui.btnPrimary}>
          Save changes
        </button>
      </div>
    </form>
  )
}
