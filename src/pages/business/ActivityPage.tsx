import { useState } from 'react'
import { Link } from 'react-router-dom'
import { listActivity } from '../../api/activity'
import type { ActivityCategory } from '../../api/types'
import { useBusiness } from '../../businessContext'
import { EmptyState, ErrorBox, Loading, PageHeader } from '../../components/ui'
import { useOnActivity } from '../../hooks/useActivity'
import { useLoad } from '../../hooks/useLoad'
import { formatDateTime } from '../../utils/format'
import { cx, ui } from '../../styles'

const ACTIVITY_CATEGORIES: { value: ActivityCategory; label: string }[] = [
  { value: 'PRODUCTS', label: 'Products' },
  { value: 'MESSAGES', label: 'Messages' },
  { value: 'CONNECTIONS', label: 'Connections' },
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
        <label className={ui.label}>
          From
          <input className={ui.inputAuto} type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className={ui.label}>
          To
          <input className={ui.inputAuto} type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </label>
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
                <th className={ui.th} aria-label="Open" />
              </tr>
            </thead>
            <tbody>
              {activity.data.map((a) => (
                <tr key={a.id}>
                  <td className={ui.td}>{formatDateTime(a.createdAt)}</td>
                  <td className={ui.td}>
                    <span className={ui.chip}>{ACTIVITY_CATEGORIES.find((c) => c.value === a.category)?.label ?? a.category}</span>
                  </td>
                  <td className={cx(ui.td, ui.wrap)}>
                    <span className="font-semibold text-heading">{a.title}</span>
                    {a.detail && <span className={cx(ui.hint, 'block')}>{a.detail}</span>}
                  </td>
                  <td className={ui.td}>{a.actorName || '—'}</td>
                  <td className={cx(ui.td, ui.actions)}>
                    {a.link && (
                      <Link to={`/business/${business.id}${a.link}`} className={ui.link}>
                        Open
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
