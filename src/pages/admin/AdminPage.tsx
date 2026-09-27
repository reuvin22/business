import { Fragment, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import * as admin from '../../api/directory'
import type { Category, VerificationRequest } from '../../api/types'
import { Badge, ConfirmButton, EmptyState, ErrorBox, Loading, PageHeader, Tabs } from '../../components/ui'
import { labelOf, VERIFICATION_TYPES } from '../../constants/options'
import { useLoad } from '../../hooks/useLoad'
import { useTab } from '../../hooks/useTab'
import { formatDate, formatDateTime } from '../../utils/format'
import { cx, ui } from '../../styles'

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
  const typeInfo = VERIFICATION_TYPES.find((t) => t.value === request.verificationType)

  async function review(status: string) {
    setError('')
    try {
      await admin.adminReviewVerification(request.id, { status, rejectionReason: reason })
      onReviewed()
    } catch (err) {
      setError((err as Error).message)
    }
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
          <button type="button" className={ui.btnPrimary} onClick={() => review('VERIFIED')}>
            Approve
          </button>
          <input className={ui.rowInput} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (needed to reject)" />
          <button type="button" className={ui.btnGhost} onClick={() => review('REJECTED')}>
            Reject
          </button>
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
          <a href={d.fileUrl} target="_blank" rel="noreferrer">
            {labelOf(d.documentType)} — {d.fileName || 'open file'}
          </a>
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

  async function act(action: () => Promise<unknown>) {
    setActionError('')
    try {
      await action()
      reload()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    await act(() => admin.adminCreateCategory({ categoryName: name, parentCategoryId: parentId || null, status: 'ACTIVE' }))
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
        <button type="submit" className={ui.btnPrimary} disabled={!name.trim()}>
          Add category
        </button>
      </form>
      <ErrorBox message={actionError} />

      {categories.length === 0 ? (
        <EmptyState
          text="No categories yet."
          action={
            <button type="button" className={ui.btnPrimary} onClick={() => act(admin.adminLoadDefaultCategories)}>
              Load starter categories
            </button>
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

  async function run(action: () => Promise<unknown>) {
    onError('')
    try {
      await action()
      setEditing(false)
      onChanged()
    } catch (err) {
      onError((err as Error).message)
    }
  }
  const save = (changes: Partial<Category>) =>
    run(() =>
      admin.adminUpdateCategory(category.id, {
        categoryName: changes.categoryName ?? category.categoryName,
        parentCategoryId: category.parentCategoryId,
        status: changes.status ?? category.status,
      }),
    )

  return (
    <div className="flex flex-wrap items-center gap-3 py-1">
      {editing ? (
        <>
          <input className={ui.inputSmall} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <button type="button" className={ui.link} onClick={() => save({ categoryName: name })}>
            Save
          </button>
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
          <button type="button" className={ui.link} onClick={() => save({ status: category.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' })}>
            {category.status === 'ACTIVE' ? 'Hide' : 'Show'}
          </button>
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
  const setStatus = async (certId: string, status: string) => {
    await admin.adminSetCertificationStatus(businessId, certId, status)
    reload()
  }

  if (!certifications) return error ? <ErrorBox message={error} /> : <Loading />
  if (certifications.length === 0) return <p className={ui.hint}>No certifications.</p>
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-4.5 text-[0.9rem]">
      {certifications.map((c) => (
        <li key={c.id}>
          <strong>{c.certificationName}</strong> {c.certificateNumber && `#${c.certificateNumber}`}{' '}
          {c.documentUrl && (
            <a href={c.documentUrl} target="_blank" rel="noreferrer">
              view copy
            </a>
          )}{' '}
          <Badge value={c.verificationStatus} />{' '}
          <button type="button" className={ui.link} onClick={() => setStatus(c.id, 'VERIFIED')}>
            Verify
          </button>{' '}
          <button type="button" className={ui.linkDanger} onClick={() => setStatus(c.id, 'REJECTED')}>
            Reject
          </button>
        </li>
      ))}
    </ul>
  )
}
