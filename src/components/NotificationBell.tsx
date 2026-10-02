import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useNotifications } from '../hooks/useActivity'
import { formatDateTime } from '../utils/format'
import { cx, ui } from '../styles'

/** The newest notifications of a business, live, with a count of the ones you haven't seen. */
export default function NotificationBell({ businessId }: { businessId: string }) {
  const { events, unread, seenAt, isNew, markSeen } = useNotifications(businessId)
  const [open, setOpen] = useState(false)
  // What was new when the list opened keeps its dot until it closes (opening marks everything seen)
  const [seenBefore, setSeenBefore] = useState(0)

  function toggle() {
    if (!open) {
      setSeenBefore(seenAt)
      markSeen()
    }
    setOpen(!open)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative grid size-9 cursor-pointer place-items-center rounded-md border-0 bg-side-hover text-side-heading hover:text-lime"
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        aria-expanded={open}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 grid min-w-4.5 place-items-center rounded-full bg-danger px-1 text-[0.68rem] leading-4.5 font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-11 left-0 z-50 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-[10px] border border-line bg-surface text-body shadow-2xl max-sm:fixed max-sm:inset-x-3 max-sm:top-16 max-sm:w-auto">
            <header className="flex items-center justify-between border-b border-line px-4 py-3">
              <strong className="text-heading">Notifications</strong>
              <Link to={`/business/${businessId}/activity`} className={cx(ui.link, 'text-[0.85rem]')} onClick={() => setOpen(false)}>
                See all activity
              </Link>
            </header>
            <div className="overflow-y-auto">
              {!events ? (
                <p className={cx(ui.hint, 'm-0 p-4')}>Loading…</p>
              ) : events.length === 0 ? (
                <p className={cx(ui.hint, 'm-0 p-4')}>Nothing yet. Product changes, messages, and connection requests show up here.</p>
              ) : (
                events.map((e) => {
                  const body = (
                    <>
                      <span className="flex items-start gap-2">
                        {isNew(e, seenBefore) && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="New" />}
                        <span className="font-semibold text-heading">{e.title}</span>
                      </span>
                      {e.detail && <span className="block truncate text-[0.85rem]">{e.detail}</span>}
                      <span className="block text-[0.75rem] text-muted">
                        {e.actorName && `${e.actorName} · `}
                        {formatDateTime(e.createdAt)}
                      </span>
                    </>
                  )
                  const rowClass = 'block border-b border-line px-4 py-3 text-inherit no-underline last:border-b-0'
                  return e.link ? (
                    <Link key={e.id} to={`/business/${businessId}${e.link}`} className={cx(rowClass, 'hover:bg-page')} onClick={() => setOpen(false)}>
                      {body}
                    </Link>
                  ) : (
                    <div key={e.id} className={rowClass}>
                      {body}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
