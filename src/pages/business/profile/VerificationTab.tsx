import { useState, type FormEvent } from 'react'
import { documentsApi, listVerificationRequests, submitVerificationRequest } from '../../../api/resources'
import { useBusiness } from '../../../businessContext'
import { Badge, EmptyState, ErrorBox, Loading } from '../../../components/ui'
import { labelOf, VERIFICATION_TYPES } from '../../../constants/options'
import { useLoad } from '../../../hooks/useLoad'
import { formatDateTime } from '../../../utils/format'
import { cx, ui } from '../../../styles'

export default function VerificationTab() {
  const { business, can, reload: reloadBusiness } = useBusiness()
  const requests = useLoad(() => listVerificationRequests(business.id), [business.id])
  const { data: documents = [] } = useLoad(() => documentsApi.list(business.id), [business.id])

  const [type, setType] = useState('BUSINESS')
  const [documentIds, setDocumentIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const hasPending = requests.data?.some((r) => r.status === 'PENDING')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await submitVerificationRequest(business.id, { verificationType: type, documentIds, notes })
      setDocumentIds([])
      setNotes('')
      requests.reload()
      reloadBusiness()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const toggleDocument = (id: string) =>
    setDocumentIds((ids) => (ids.includes(id) ? ids.filter((d) => d !== id) : [...ids, id]))

  return (
    <>
      <section className={ui.section}>
        <div className={ui.sectionHead}>
          <div>
            <h2 className={ui.h2}>Verification</h2>
            <p className={ui.hint}>
              Current status: <Badge value={business.verificationStatus} />
              {business.verificationLevel && ` · ${labelOf(business.verificationLevel)} level`}. A platform admin checks
              your documents. The badge only claims what was actually checked.
            </p>
          </div>
        </div>

        {can('business.edit') && !hasPending && (
          <form className={ui.formCard} onSubmit={handleSubmit}>
            <h2 className={ui.h2}>Request verification</h2>
            <div className="flex flex-col gap-2.5">
              {VERIFICATION_TYPES.map((option) => (
                <label key={option.value} className={ui.checkboxLabel}>
                  <input type="radio" className={ui.checkbox} name="type" checked={type === option.value} onChange={() => setType(option.value)} />
                  <span>
                    <strong>{option.label}</strong>
                    <span className="block text-[0.78rem] font-normal text-muted">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[0.88rem] font-semibold text-heading">Attach documents {type !== 'BASIC' && '*'}</span>
              {documents.length === 0 ? (
                <span className={ui.hint}>Add documents on the Documents tab first.</span>
              ) : (
                documents.map((d) => (
                  <label key={d.id} className={ui.checkboxLabel}>
                    <input type="checkbox" className={ui.checkbox} checked={documentIds.includes(d.id)} onChange={() => toggleDocument(d.id)} />
                    <span>
                      {labelOf(d.documentType)} — {d.fileName || d.fileUrl}
                    </span>
                  </label>
                ))
              )}
            </div>

            <label className={ui.label}>
              Notes for the reviewer
              <textarea className={ui.input} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            <ErrorBox message={error} />
            <div className={ui.formActions}>
              <button type="submit" className={ui.btnPrimary} disabled={saving}>
                {saving ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className={ui.section}>
        <h2 className={ui.h2}>Requests</h2>
        <ErrorBox message={requests.error} />
        {requests.loading && !requests.data ? (
          <Loading />
        ) : !requests.data?.length ? (
          <EmptyState text="No verification requests yet." />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th className={ui.th}>Submitted</th>
                  <th className={ui.th}>Level</th>
                  <th className={ui.th}>Documents</th>
                  <th className={ui.th}>Status</th>
                  <th className={ui.th}>Reviewer note</th>
                </tr>
              </thead>
              <tbody>
                {requests.data.map((r) => (
                  <tr key={r.id}>
                    <td className={ui.td}>{formatDateTime(r.submittedAt)}</td>
                    <td className={ui.td}>{labelOf(r.verificationType)}</td>
                    <td className={ui.td}>{r.documentIds.length}</td>
                    <td className={ui.td}>
                      <Badge value={r.status} />
                    </td>
                    <td className={cx(ui.td, ui.wrap)}>{r.rejectionReason || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
