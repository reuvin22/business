import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listActivity } from '../../api/activity'
import type { Activity, ActivityCategory } from '../../api/types'
import { useBusiness } from '../../businessContext'
import DateRangePicker from '../../components/DateRangePicker'
import { EmptyState, ErrorBox, Loading, Modal, PageHeader } from '../../components/ui'
import { useOnActivity } from '../../hooks/useActivity'
import { useLoad } from '../../hooks/useLoad'
import { formatDateTime } from '../../utils/format'
import { cx, ui } from '../../styles'

const ACTIVITY_CATEGORIES: { value: ActivityCategory; label: string }[] = [
  { value: 'PRODUCTS', label: 'Products' },
  { value: 'MESSAGES', label: 'Messages' },
  { value: 'CONNECTIONS', label: 'Connections' },
  { value: 'ORDERS', label: 'Orders' },
]

/** "2026-10-02" -> that day's first or last millisecond, on this computer's clock (so "today" is your today). */
const dayStart = (day: string) => (day ? new Date(`${day}T00:00:00`).getTime() : undefined)
const dayEnd = (day: string) => (day ? new Date(`${day}T23:59:59.999`).getTime() : undefined)

/** Everything that happened to this business, newest first. New entries appear by themselves. */
export default function ActivityPage() {
  const { business } = useBusiness()
  const [category, setCategory] = useState<ActivityCategory | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [viewing, setViewing] = useState<Activity | null>(null)

  const activity = useLoad(
    () => listActivity(business.id, { category, start: dayStart(from), end: dayEnd(to) }),
    [business.id, category, from, to],
  )
  useOnActivity(business.id, [], () => activity.reload())

  const filtered = category !== '' || from !== '' || to !== ''

  return (
    <div className={ui.page}>
      <PageHeader title="Activity" subtitle="Product changes, messages, and connections, for everyone in your team." />

      <div className={cx(ui.card, 'flex flex-wrap items-end gap-3 px-4 py-3.5')}>
        <label className={ui.label}>
          Show
          <select className={ui.inputAuto} value={category} onChange={(e) => setCategory(e.target.value as ActivityCategory | '')}>
            <option value="">All</option>
            {ACTIVITY_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <div className={ui.label}>
          Dates
          <DateRangePicker
            label="Dates"
            value={{ from, to }}
            max={new Date().toLocaleDateString('en-CA')}
            allowAll
            onChange={(range) => {
              setFrom(range.from)
              setTo(range.to)
            }}
          />
        </div>
        {filtered && (
          <button
            type="button"
            className={ui.btnGhost}
            onClick={() => {
              setCategory('')
              setFrom('')
              setTo('')
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      <ErrorBox message={activity.error} />
      {!activity.data ? (
        <Loading />
      ) : activity.data.length === 0 ? (
        <EmptyState text={filtered ? 'Nothing matches these filters.' : 'Nothing has happened yet.'} />
      ) : (
        <div className={cx(ui.tableWrap, activity.loading && 'opacity-60')}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th className={ui.th}>When</th>
                <th className={ui.th}>Kind</th>
                <th className={ui.th}>What happened</th>
                <th className={ui.th}>By</th>
                <th className={ui.th} aria-label="Details" />
              </tr>
            </thead>
            <tbody>
              {activity.data.map((a) => (
                <tr key={a.id} className="cursor-pointer hover:bg-page" onClick={() => setViewing(a)}>
                  <td className={ui.td}>{formatDateTime(a.createdAt)}</td>
                  <td className={ui.td}>
                    <span className={ui.chip}>{ACTIVITY_CATEGORIES.find((c) => c.value === a.category)?.label ?? a.category}</span>
                  </td>
                  <td className={cx(ui.td, ui.wrap)}>
                    <span className="font-semibold text-heading">{a.title}</span>
                    {a.detail && <span className={cx(ui.hint, 'line-clamp-1 block')}>{a.detail}</span>}
                  </td>
                  <td className={ui.td}>{a.actorName || '—'}</td>
                  <td className={cx(ui.td, ui.actions)}>
                    <button
                      type="button"
                      className={ui.link}
                      onClick={(e) => {
                        e.stopPropagation() // the row opens it too
                        setViewing(a)
                      }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewing && <ActivityDetails activity={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}

// Where an entry's link goes, said in words
const GO_TO: Record<ActivityCategory, string> = {
  PRODUCTS: 'Go to the product',
  MESSAGES: 'Open the conversation',
  CONNECTIONS: 'Go to Network',
  ORDERS: 'Open the order',
}

/** Everything about one entry of the history, in a dialog (the page stays where it is). */
function ActivityDetails({ activity: a, onClose }: { activity: Activity; onClose: () => void }) {
  const { business } = useBusiness()
  const kind = ACTIVITY_CATEGORIES.find((c) => c.value === a.category)?.label ?? a.category

  return (
    <Modal title={a.title} onClose={onClose} size="sm">
      <div className="flex flex-col gap-5 p-6 max-sm:p-4">
        <div className="flex flex-col gap-2">
          <span className={cx(ui.chip, 'self-start')}>{kind}</span>
          <h2 className={cx(ui.h2, 'leading-snug')}>{a.title}</h2>
        </div>

        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-[0.92rem]">
          <dt className="text-muted">When</dt>
          <dd className="m-0 text-heading">
            {new Date(a.createdAt).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short' })}
          </dd>
          <dt className="text-muted">By</dt>
          <dd className="m-0 text-heading">{a.actorName || '—'}</dd>
        </dl>

        {a.detail && (
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-bold tracking-wider text-muted uppercase">
              {a.category === 'MESSAGES' ? 'Message' : a.category === 'CONNECTIONS' ? 'Note' : a.category === 'ORDERS' ? 'Order' : 'Details'}
            </span>
            <p className="m-0 rounded-lg bg-chip px-3.5 py-3 whitespace-pre-line text-heading">{a.detail}</p>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2.5 border-t border-line pt-4">
          {a.link && (
            <Link to={`/business/${business.id}${a.link}`} className={ui.btnGhost}>
              {GO_TO[a.category]}
            </Link>
          )}
          <button type="button" className={ui.btnPrimary} onClick={onClose} autoFocus>
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
