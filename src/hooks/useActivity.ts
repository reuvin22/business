import { get, limitToLast, onChildAdded, onValue, orderByChild, query, ref, set, startAfter } from 'firebase/database'
import { useEffect, useRef, useState } from 'react'
import { getChatAccess } from '../api/chat'
import type { Activity, ActivityCategory, ChatAccess } from '../api/types'
import { rtdb } from '../firebase'
import { useAuth } from '../useAuth'
import { decryptFields } from '../utils/crypto'

// A business's activity arrives live from the Realtime Database (live/{businessId}/activity).
// The API writes it; the browser only listens. Reading needs the API's permission first.

const access = new Map<string, Promise<ChatAccess>>()

/**
 * Asks the API (once per business and page load) to let this user read the business's live data.
 * The answer also holds the keys that decrypt it.
 */
export function ensureLiveAccess(businessId: string): Promise<ChatAccess> {
  let asked = access.get(businessId)
  if (!asked) {
    asked = getChatAccess(businessId)
    asked.catch(() => access.delete(businessId)) // try again next time
    access.set(businessId, asked)
  }
  return asked
}

const feedPath = (businessId: string) => `live/${businessId}/activity`

/** The time on the database's clock (activity times come from the server, not from this computer). */
async function serverNow(): Promise<number> {
  const offset = await get(ref(rtdb, '.info/serverTimeOffset')).then(
    (snapshot) => Number(snapshot.val() ?? 0),
    () => 0,
  )
  return Date.now() + offset
}

/**
 * Calls `onEvent` for every NEW activity of these kinds (not the ones from before the page opened),
 * e.g. to reload the Network page the moment the other business withdraws.
 * Pass no categories to hear every kind.
 */
export function useOnActivity(businessId: string | null | undefined, categories: ActivityCategory[], onEvent: (activity: Activity) => void) {
  const latest = useRef(onEvent)
  useEffect(() => {
    latest.current = onEvent
  })
  const kinds = categories.join()

  useEffect(() => {
    if (!businessId) return
    let stop = () => {}
    let stopped = false
    Promise.all([serverNow(), ensureLiveAccess(businessId)]).then(
      ([now, { liveKeys }]) => {
        if (stopped) return
        // Only what happens from now on
        const fromNow = query(ref(rtdb, feedPath(businessId)), orderByChild('createdAt'), startAfter(now))
        stop = onChildAdded(
          fromNow,
          (snapshot) => {
            const sealed = { ...(snapshot.val() as Omit<Activity, 'id'>), id: snapshot.key ?? '' }
            if (kinds && !kinds.split(',').includes(sealed.category)) return
            decryptFields(sealed, liveKeys).then((activity) => !stopped && latest.current(activity))
          },
          () => undefined, // not allowed (rules not deployed): pages still work, just not live
        )
      },
      () => undefined,
    )
    return () => {
      stopped = true
      stop()
    }
  }, [businessId, kinds])
}

/** The newest activity (for the notification bell), and when this user last looked at it. */
export function useNotifications(businessId: string, limit = 20) {
  const { user } = useAuth()
  const [events, setEvents] = useState<Activity[] | undefined>(undefined)
  const [seenAt, setSeenAt] = useState(0)

  useEffect(() => {
    let stops: (() => void)[] = []
    let stopped = false
    ensureLiveAccess(businessId).then(
      ({ liveKeys }) => {
        if (stopped) return
        let turn = 0 // decrypting takes a moment: only the newest snapshot is shown
        stops = [
          onValue(
            query(ref(rtdb, feedPath(businessId)), orderByChild('createdAt'), limitToLast(limit)),
            (snapshot) => {
              const mine = ++turn
              Promise.all(
                Object.entries((snapshot.val() ?? {}) as Record<string, Omit<Activity, 'id'>>).map(([id, item]) =>
                  decryptFields({ ...item, id }, liveKeys),
                ),
              ).then((found) => {
                if (!stopped && mine === turn) setEvents(found.sort((a, b) => b.createdAt - a.createdAt))
              })
            },
            () => setEvents([]),
          ),
        ]
        if (user) {
          stops.push(
            onValue(
              ref(rtdb, `notificationSeen/${user.uid}/${businessId}`),
              (snapshot) => setSeenAt(Number(snapshot.val() ?? 0)),
              () => undefined,
            ),
          )
        }
      },
      () => setEvents([]),
    )
    return () => {
      stopped = true
      stops.forEach((stop) => stop())
    }
  }, [businessId, limit, user])

  // Your own changes are in the history, but they are not news to you
  const isNew = (e: Activity, since = seenAt) => e.createdAt > since && e.actorUid !== user?.uid
  const unread = (events ?? []).filter((e) => isNew(e)).length

  function markSeen() {
    if (!user || !events?.length) return
    // The rules only accept a time that is not in the future
    set(ref(rtdb, `notificationSeen/${user.uid}/${businessId}`), Math.min(Date.now(), events[0].createdAt + 1)).catch(
      () => undefined,
    )
  }

  return { events, unread, seenAt, isNew, markSeen }
}
