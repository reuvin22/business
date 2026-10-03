import { Fragment, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as admin from '../../api/directory'
import type { Category, VerificationRequest } from '../../api/types'
import { Badge, BusyButton, ConfirmButton, EmptyState, ErrorBox, Loading, PageHeader, Tabs } from '../../components/ui'
import { labelOf, VERIFICATION_TYPES } from '../../constants/options'
import { useRunning } from '../../hooks/useBusy'
import { useLoad } from '../../hooks/useLoad'
import { useTab } from '../../hooks/useTab'
import { formatDate, formatDateTime } from '../../utils/format'
import { cx, ui } from '../../styles'
import { adminOpenPrivateFile } from '../../api/uploads'
import PrivateFileButton from '../../components/PrivateFile'

const TABS = [
  { key: 'verifications', label: 'Verification requests' },
  { key: 'categories', label: 'Categories' },
  { key: 'businesses', label: 'All businesses' },
]

export default function AdminPage() {
  const { data: me } = useLoad(admin.getMe, [])
  const [tab, setTab] = useTab(TABS)

  if (me && !me.isAdmin) return <div className={ui.page}><ErrorBox message="Only platform admins can open this page." /></div>

  return (
    <div className={ui.page}>
      <PageHeader title="Platform admin" subtitle="Review verifications, manage the shared categories, and check businesses." />
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      {tab === 'verifications' && <VerificationsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'businesses' && <BusinessesTab />}
    </div>
  )
}

// ---- Verification requests ------------------------------------------------------------

function VerificationsTab() {
  const [status, setStatus] = useState('PENDING')
  const { data: requests, error, reload } = useLoad(() => admin.adminListVerifications(status || undefined), [status])

  return (
    <section className={ui.section}>
      <div className={ui.sectionHead}>
        <p className={ui.hint}>Only approve what you actually checked. The level shown to other businesses says what was verified.</p>
        <select className={ui.inputAuto} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">
          <option value="PENDING">Pending</option>
          <option value="">All</option>
        </select>
      </div>
      <ErrorBox message={error} />
      {!requests ? (
        <Loading />
      ) : requests.length === 0 ? (
        <EmptyState text="No requests to review." />
      ) : (
        requests.map((r) => <RequestCard key={r.id} request={r} onReviewed={reload} />)
      )}
    </section>
  )
}

function RequestCard({ request, onReviewed }: { request: VerificationRequest; onReviewed: () => void }) {
  const [showDocuments, setShowDocuments] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [running, run] = useRunning()
  const typeInfo = VERIFICATION_TYPES.find((t) => t.value === request.verificationType)

  async function review(status: string) {
    setError('')
    await run(status, async () => {
      try {
        await admin.adminReviewVerification(request.id, { status, rejectionReason: reason })
        onReviewed()
      } catch (err) {
        setError((err as Error).message)
      }
    })
  }

  return (
    <article className={cx(ui.card, 'flex flex-col gap-2 px-4.5 py-4')}>
      <header className="text-heading">
        <strong>{request.businessName}</strong> · {typeInfo?.label} <Badge value={request.status} />
        <span className="text-[0.82rem] text-muted"> submitted {formatDateTime(request.submittedAt)}</span>
      </header>
      <p className={ui.hint}>Check: {typeInfo?.description}</p>
      {request.notes && <p className="whitespace-pre-line">“{request.notes}”</p>}

      <button type="button" className={ui.link} onClick={() => setShowDocuments((v) => !v)}>
        {showDocuments ? 'Hide' : 'Show'} {request.documentIds.length} document(s)
      </button>
      {showDocuments && <RequestDocuments request={request} />}

      {request.status === 'PENDING' ? (
        <div className={ui.actionRow}>
          <BusyButton className={ui.btnPrimary} busy={running === 'VERIFIED'} disabled={running !== ''} onClick={() => review('VERIFIED')}>
            Approve
          </BusyButton>
          <input className={ui.rowInput} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (needed to reject)" />
          <BusyButton className={ui.btnGhost} busy={running === 'REJECTED'} disabled={running !== ''} onClick={() => review('REJECTED')}>
            Reject
          </BusyButton>
        </div>
      ) : (
        <div className={ui.actionRow}>
          <span className={ui.hint}>
            Reviewed {formatDateTime(request.reviewedAt)}
            {request.rejectionReason && ` · ${request.rejectionReason}`}
          </span>
          {request.status === 'VERIFIED' && (
            <>
              <ConfirmButton label="Suspend business" onConfirm={() => review('SUSPENDED')} />
              <ConfirmButton label="Mark expired" onConfirm={() => review('EXPIRED')} />
            </>
          )}
        </div>
      )}
      <ErrorBox message={error} />
    </article>
  )
}

function RequestDocuments({ request }: { request: VerificationRequest }) {
  const { data: documents, error } = useLoad(() => admin.adminListDocuments(request.businessId), [request.businessId])
  if (!documents) return error ? <ErrorBox message={error} /> : <Loading />
  const attached = documents.filter((d) => request.documentIds.includes(d.id))
  if (attached.length === 0) return <p className={ui.hint}>No documents attached (or they were deleted).</p>
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-4.5 text-[0.9rem]">
      {attached.map((d) => (
        <li key={d.id}>
          <PrivateFileButton
            value={d.fileUrl}
            label={`${labelOf(d.documentType)} — ${d.fileName || 'open file'}`}
            title={`${request.businessName} · ${labelOf(d.documentType)}`}
            open={() => adminOpenPrivateFile(d.fileUrl)}
          />
          {d.expiryDate && <span className="text-[0.82rem] text-muted"> · expires {formatDate(d.expiryDate)}</span>} <Badge value={d.verificationStatus} />
        </li>
      ))}
    </ul>
  )
}

// ---- Categories ---------------------------------------------------------------------

function CategoriesTab() {
  const { data: categories, error, reload } = useLoad(admin.listCategories, [])
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState('')
  const [actionError, setActionError] = useState('')
  const [running, run] = useRunning()

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

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    await act('add', () => admin.adminCreateCategory({ categoryName: name, parentCategoryId: parentId || null, status: 'ACTIVE' }))
    setName('')
  }

  if (!categories) return error ? <ErrorBox message={error} /> : <Loading />
  const topLevel = categories.filter((c) => !c.parentCategoryId)
  const childrenOf = (id: string) => categories.filter((c) => c.parentCategoryId === id)

  return (
    <section className={ui.section}>
      <form className={cx(ui.card, 'flex flex-wrap items-center gap-2.5 px-4 py-3.5')} onSubmit={handleAdd}>
        <input className={ui.rowInput} value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name" />
        <select className={ui.inputAuto} value={parentId} onChange={(e) => setParentId(e.target.value)} aria-label="Parent category">
          <option value="">Top level</option>
          {topLevel.map((c) => (
            <option key={c.id} value={c.id}>
              Inside {c.categoryName}
            </option>
          ))}
        </select>
        <BusyButton type="submit" className={ui.btnPrimary} disabled={!name.trim()} busy={running === 'add'} busyLabel="Adding…">
          Add category
        </BusyButton>
      </form>
      <ErrorBox message={actionError} />

      {categories.length === 0 ? (
        <EmptyState
          text="No categories yet."
          action={
            <BusyButton className={ui.btnPrimary} busy={running === 'defaults'} busyLabel="Loading…" onClick={() => act('defaults', admin.adminLoadDefaultCategories)}>
              Load starter categories
            </BusyButton>
          }
        />
      ) : (
        <div className={cx(ui.card, 'flex flex-col px-4.5 py-3')}>
          {topLevel.map((parent) => (
            <div key={parent.id} className="border-b border-line py-2 last:border-b-0">
              <CategoryRow category={parent} onChanged={reload} onError={setActionError} />
              {childrenOf(parent.id).map((child) => (
                <div key={child.id} className="pl-6">
                  <CategoryRow category={child} onChanged={reload} onError={setActionError} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function CategoryRow({ category, onChanged, onError }: { category: Category; onChanged: () => void; onError: (m: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.categoryName)

  const [running, start] = useRunning()

  async function run(action: () => Promise<unknown>, name = 'delete') {
    onError('')
    await start(name, async () => {
      try {
        await action()
        setEditing(false)
        onChanged()
      } catch (err) {
        onError((err as Error).message)
      }
    })
  }
  const save = (changes: Partial<Category>) =>
    run(
      () =>
      admin.adminUpdateCategory(category.id, {
        categoryName: changes.categoryName ?? category.categoryName,
        parentCategoryId: category.parentCategoryId,
        status: changes.status ?? category.status,
      }),
      changes.status ? 'status' : 'rename',
    )

  return (
    <div className="flex flex-wrap items-center gap-3 py-1">
      {editing ? (
        <>
          <input className={ui.inputSmall} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <BusyButton className={ui.link} busy={running === 'rename'} onClick={() => save({ categoryName: name })}>
            Save
          </BusyButton>
          <button type="button" className={ui.link} onClick={() => setEditing(false)}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <span className={cx('min-w-45 font-semibold', category.status === 'ACTIVE' ? 'text-heading' : 'text-muted')}>{category.categoryName}</span>
          {category.status !== 'ACTIVE' && <Badge value={category.status} />}
          <button type="button" className={ui.link} onClick={() => setEditing(true)}>
            Rename
          </button>
          <BusyButton className={ui.link} busy={running === 'status'} onClick={() => save({ status: category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>
            {category.status === 'ACTIVE' ? 'Hide' : 'Show'}
          </BusyButton>
          <ConfirmButton label="Delete" onConfirm={() => run(() => admin.adminDeleteCategory(category.id))} />
        </>
      )}
    </div>
  )
}

// ---- All businesses -----------------------------------------------------------------

function BusinessesTab() {
  const { data: businesses, error } = useLoad(admin.adminListBusinesses, [])
  const [openId, setOpenId] = useState<string | null>(null)

  if (!businesses) return error ? <ErrorBox message={error} /> : <Loading />
  return (
    <div className={ui.tableWrap}>
      <table className={ui.table}>
        <thead>
          <tr>
            <th className={ui.th}>Business</th>
            <th className={ui.th}>Types</th>
            <th className={ui.th}>Status</th>
            <th className={ui.th}>Verification</th>
            <th className={ui.th}>Created</th>
            <th className={ui.th} aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {businesses.map((b) => (
            <Fragment key={b.id}>
              <tr>
                <td className={cx(ui.td, ui.strong)}>
                  <Link to={`/dashboard/directory/${b.id}`} className={ui.rowLink}>
                    {b.businessName}
                  </Link>
                </td>
                <td className={cx(ui.td, ui.wrap)}>{b.businessTypes.map(labelOf).join(', ')}</td>
                <td className={ui.td}>
                  <Badge value={b.businessStatus} />
                </td>
                <td className={ui.td}>
                  <Badge value={b.verificationStatus} />
                  {b.verificationLevel && <span className="text-[0.82rem] text-muted"> {labelOf(b.verificationLevel)}</span>}
                </td>
                <td className={ui.td}>{formatDateTime(b.createdAt)}</td>
                <td className={cx(ui.td, ui.actions)}>
                  <button type="button" className={ui.link} onClick={() => setOpenId(openId === b.id ? null : b.id)}>
                    {openId === b.id ? 'Hide' : 'Certifications'}
                  </button>
                </td>
              </tr>
              {openId === b.id && (
                <tr>
                  <td className={ui.td} colSpan={6}>
                    <BusinessCertifications businessId={b.id} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BusinessCertifications({ businessId }: { businessId: string }) {
  const { data: certifications, error, reload } = useLoad(() => admin.adminListCertifications(businessId), [businessId])
  const [running, run] = useRunning()
  const setStatus = (certId: string, status: string) =>
    run(`${certId}:${status}`, async () => {
      await admin.adminSetCertificationStatus(businessId, certId, status)
      reload()
    })

  if (!certifications) return error ? <ErrorBox message={error} /> : <Loading />
  if (certifications.length === 0) return <p className={ui.hint}>No certifications.</p>
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-4.5 text-[0.9rem]">
      {certifications.map((c) => (
        <li key={c.id}>
          <strong>{c.certificationName}</strong> {c.certificateNumber && `#${c.certificateNumber}`}{' '}
          {c.documentUrl && (
            <PrivateFileButton value={c.documentUrl} label="view copy" title={c.certificationName} open={() => adminOpenPrivateFile(c.documentUrl)} />
          )}{' '}
          <Badge value={c.verificationStatus} />{' '}
          <BusyButton className={ui.link} busy={running === `${c.id}:VERIFIED`} disabled={running !== ''} onClick={() => setStatus(c.id, 'VERIFIED')}>
            Verify
          </BusyButton>{' '}
          <BusyButton className={ui.linkDanger} busy={running === `${c.id}:REJECTED`} disabled={running !== ''} onClick={() => setStatus(c.id, 'REJECTED')}>
            Reject
          </BusyButton>
        </li>
      ))}
    </ul>
  )
}
