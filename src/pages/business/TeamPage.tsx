import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { addMember, cancelInvitation, listInvitations, listMembers, removeMember, updateMember } from '../../api/businesses'
import type { Member } from '../../api/types'
import { useBusiness } from '../../businessContext'
import { Badge, BusyButton, ConfirmButton, ErrorBox, Loading, Modal, PageHeader } from '../../components/ui'
import { labelOf, MEMBER_ROLES, MEMBER_STATUSES, PERMISSIONS, ROLE_PERMISSIONS } from '../../constants/options'
import { useBusy } from '../../hooks/useBusy'
import { useLoad } from '../../hooks/useLoad'
import { useAuth } from '../../useAuth'
import { formatDateTime } from '../../utils/format'
import { cx, ui } from '../../styles'
import PosTemplateSection from './team/PosTemplateSection'
import SellersSection from './team/SellersSection'

export default function TeamPage() {
  const { business, role, can } = useBusiness()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: members, error, reload } = useLoad(() => listMembers(business.id), [business.id])
  const invitations = useLoad(() => listInvitations(business.id), [business.id])
  const [editing, setEditing] = useState<Member | null>(null)
  const [adding, setAdding] = useState(false)
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
      <PageHeader
        title="Team"
        subtitle="People who can work on this business, and what each of them may change."
        actions={
          canManage && (
            <button type="button" className={ui.btnPrimary} onClick={() => setAdding(true)}>
              + Invite team member
            </button>
          )
        }
      />

      {adding && (
        <AddMemberForm
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false)
            invitations.reload()
          }}
        />
      )}
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
      {!!invitations.data?.length && (
        <section className="mt-2 flex flex-col gap-2">
          <h2 className={ui.h2}>Waiting for an answer</h2>
          <p className={cx(ui.hint, 'm-0')}>They join when they accept the invitation (under My businesses in SIRIS).</p>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <tbody>
                {invitations.data.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className={cx(ui.td, ui.strong)}>
                      {invitation.displayName || invitation.email}
                      <div className="text-[0.82rem] text-muted">{invitation.email}</div>
                    </td>
                    <td className={ui.td}>{invitation.role === 'SELLER' ? 'Seller' : labelOf(invitation.role)}</td>
                    <td className={ui.td}>Invited {formatDateTime(invitation.createdAt)}</td>
                    <td className={cx(ui.td, ui.actions)}>
                      {canManage && (
                        <ConfirmButton
                          label="Cancel invitation"
                          onConfirm={async () => {
                            try {
                              await cancelInvitation(business.id, invitation.id)
                              invitations.reload()
                            } catch (err) {
                              setActionError((err as Error).message)
                            }
                          }}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {role.role === 'OWNER' && <p className={ui.hint}>You are the owner. Owners cannot leave the business; they can only delete it (Profile → Business info).</p>}

      <SellersSection />
      <PosTemplateSection />
    </div>
  )
}

function AddMemberForm({ onAdded, onClose }: { onAdded: () => void; onClose: () => void }) {
  const { business } = useBusiness()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('STAFF')
  const [error, setError] = useState('')
  const [saving, run] = useBusy()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    await run(async () => {
      try {
        await addMember(business.id, { email, role })
        onAdded()
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <Modal title="Invite a team member" onClose={onClose}>
      <form className={ui.modalForm} onSubmit={handleSubmit}>
        <h2 className={ui.h2}>Invite a team member</h2>
        <p className={ui.hint}>
          They need to have signed up already, and they join when they accept the invitation. They get the default permissions for
          their role; you can change them after. You can only give permissions you have yourself.
        </p>
        <div className={ui.formGrid}>
          <label className={ui.label}>
            Email *
            <input className={ui.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@email.com" autoFocus />
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
        <ErrorBox message={error} />
        <div className={ui.formActions}>
          <button type="button" className={ui.btnGhost} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <BusyButton type="submit" className={ui.btnPrimary} disabled={!email.trim()} busy={saving} busyLabel="Inviting…">
            Send invitation
          </BusyButton>
        </div>
      </form>
    </Modal>
  )
}

function EditMemberForm({ member, onDone }: { member: Member; onDone: () => void }) {
  const { business } = useBusiness()
  const [role, setRole] = useState(member.role)
  const [permissions, setPermissions] = useState<string[]>(member.permissions)
  const [status, setStatus] = useState(member.status)
  const [error, setError] = useState('')
  const [saving, run] = useBusy()

  const togglePermission = (p: string) =>
    setPermissions((list) => (list.includes(p) ? list.filter((x) => x !== p) : [...list, p]))

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await run(async () => {
      try {
        await updateMember(business.id, member.id, { role, permissions, status })
        onDone()
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <Modal title={`Edit ${member.displayName || member.email}`} onClose={onDone} size="md">
      <form className={ui.modalForm} onSubmit={handleSubmit}>
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
          <BusyButton type="submit" className={ui.btnPrimary} busy={saving} busyLabel="Saving…">
            Save changes
          </BusyButton>
        </div>
      </form>
    </Modal>
  )
}
