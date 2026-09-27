import { useState, type FormEvent } from 'react'
import { documentsApi, listVerificationRequests, submitVerificationRequest } from '../../../api/resources'
import { useBusiness } from '../../../businessContext'
import { Badge, EmptyState, ErrorBox, Loading } from '../../../components/ui'
import { labelOf, VERIFICATION_TYPES } from '../../../constants/options'
import { useLoad } from '../../../hooks/useLoad'
import { formatDateTime } from '../../../utils/format'

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
      <section className="resource-section">
        <div className="section-head">
          <div>
            <h2>Verification</h2>
            <p className="hint">
              Current status: <Badge value={business.verificationStatus} />
              {business.verificationLevel && ` · ${labelOf(business.verificationLevel)} level`}. A platform admin checks
              your documents. The badge only claims what was actually checked.
            </p>
          </div>
        </div>

        {can('business.edit') && !hasPending && (
          <form className="card form-card" onSubmit={handleSubmit}>
            <h2>Request verification</h2>
            <div className="radio-list">
              {VERIFICATION_TYPES.map((option) => (
                <label key={option.value} className="checkbox-label">
                  <input type="radio" name="type" checked={type === option.value} onChange={() => setType(option.value)} />
                  <span>
                    <strong>{option.label}</strong>
                    <span className="field-hint">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="field-group">
              <span className="field-label">Attach documents {type !== 'BASIC' && '*'}</span>
              {documents.length === 0 ? (
                <span className="hint">Add documents on the Documents tab first.</span>
              ) : (
                documents.map((d) => (
                  <label key={d.id} className="checkbox-label">
                    <input type="checkbox" checked={documentIds.includes(d.id)} onChange={() => toggleDocument(d.id)} />
                    <span>
                      {labelOf(d.documentType)} — {d.fileName || d.fileUrl}
                    </span>
                  </label>
                ))
              )}
            </div>

            <label>
              Notes for the reviewer
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>

            <ErrorBox message={error} />
            <div className="form-actions">
              <button type="submit" className="btn btn-primary btn-auto" disabled={saving}>
                {saving ? 'Submitting…' : 'Submit for review'}
              </button>
            </div>
          </form>
        )}
      </section>

      <section className="resource-section">
        <h2>Requests</h2>
        <ErrorBox message={requests.error} />
        {requests.loading && !requests.data ? (
          <Loading />
        ) : !requests.data?.length ? (
          <EmptyState text="No verification requests yet." />
        ) : (
          <div className="table-wrap card">
            <table className="table">
              <thead>
                <tr>
                  <th>Submitted</th>
                  <th>Level</th>
                  <th>Documents</th>
                  <th>Status</th>
                  <th>Reviewer note</th>
                </tr>
              </thead>
              <tbody>
                {requests.data.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDateTime(r.submittedAt)}</td>
                    <td>{labelOf(r.verificationType)}</td>
                    <td>{r.documentIds.length}</td>
                    <td>
                      <Badge value={r.status} />
                    </td>
                    <td className="wrap">{r.rejectionReason || '—'}</td>
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
