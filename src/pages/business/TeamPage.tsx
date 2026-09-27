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
    <div className="page">
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
        <div className="table-wrap card">
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Can change</th>
                <th>Status</th>
                <th>Joined</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {members.map((m) => {
                const isMe = m.id === user?.uid
                const isOwner = m.role === 'OWNER'
                return (
                  <tr key={m.id}>
                    <td className="strong">
                      {m.displayName || m.email}
                      {isMe && ' (you)'}
                      <div className="muted small">{m.email}</div>
                    </td>
                    <td>{labelOf(m.role)}</td>
                    <td className="wrap small">
                      {isOwner ? 'Everything' : m.permissions.map((p) => PERMISSIONS.find((o) => o.value === p)?.label ?? p).join(', ') || 'View only'}
                    </td>
                    <td>
                      <Badge value={m.status} />
                    </td>
                    <td>{formatDateTime(m.joinedAt)}</td>
                    <td className="actions">
                      {canManage && !isOwner && !isMe && (
                        <button type="button" className="link" onClick={() => setEditing(m)}>
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
      {role.role === 'OWNER' && <p className="hint">You are the owner. Owners cannot leave the business; they can only delete it (Profile → Business info).</p>}
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
    <form className="card form-card" onSubmit={handleSubmit}>
      <h2>Add a team member</h2>
      <p className="hint">They need to have signed up already. They get the default permissions for their role; you can change them after.</p>
      <div className="form-grid">
        <label>
          Email *
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@email.com" />
        </label>
        <label>
          Role *
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {MEMBER_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message && <p className="alert alert-info">{message}</p>}
      <ErrorBox message={error} />
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-auto" disabled={!email.trim()}>
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
    <form className="card form-card" onSubmit={handleSubmit}>
      <h2>Edit {member.displayName || member.email}</h2>
      <div className="form-grid">
        <label>
          Role
          <select
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
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {MEMBER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="field-group">
        <span className="field-label">Permissions (changing the role resets these to its defaults)</span>
        <div className="check-grid">
          {PERMISSIONS.map((p) => (
            <label key={p.value} className="checkbox-label">
              <input type="checkbox" checked={permissions.includes(p.value)} onChange={() => togglePermission(p.value)} />
              <span>{p.label}</span>
            </label>
          ))}
        </div>
      </div>
      <ErrorBox message={error} />
      <div className="form-actions">
        <button type="button" className="btn btn-ghost" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary btn-auto">
          Save changes
        </button>
      </div>
    </form>
  )
}
