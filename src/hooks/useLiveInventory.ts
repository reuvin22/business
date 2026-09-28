import { collection, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { listInventory } from '../api/catalog'
import type { InventoryItem } from '../api/types'
import { db } from '../firebase'

// Used when live updates are not allowed (e.g. the Firestore rules are not deployed yet)
const FALLBACK_REFRESH_MS = 15_000

type LiveState = { businessId: string; data: InventoryItem[] | undefined; live: boolean; error: string }

/**
 * Stock levels that update by themselves: a sale in the selling app (or by a teammate)
 * shows up here within a second, without reloading.
 *
 * It listens to Firestore directly (read only; see firestore.rules in my-business-be).
 * If that is not allowed, it falls back to asking the API every 15 seconds.
 */
export function useLiveInventory(businessId: string) {
  const [state, setState] = useState<LiveState>({ businessId, data: undefined, live: false, error: '' })
  // Bumped by refresh(): only needed without live updates, to show your own change right away
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let timer: number | undefined
    let stopped = false

    const poll = () =>
      listInventory(businessId, { fresh: true }).then(
        (data) => !stopped && setState({ businessId, data, live: false, error: '' }),
        (err: Error) => !stopped && setState((old) => ({ ...old, businessId, error: err.message })),
      )

    const unsubscribe = onSnapshot(
      collection(db, 'businesses', businessId, 'inventory'),
      (snapshot) => {
        const data = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as InventoryItem)
          .sort((a, b) => a.createdAt - b.createdAt) // same order as the API
        setState({ businessId, data, live: true, error: '' })
      },
      () => {
        // Not allowed to listen: use the API instead
        poll()
        timer = window.setInterval(poll, FALLBACK_REFRESH_MS)
      },
    )

    return () => {
      stopped = true
      unsubscribe()
      window.clearInterval(timer)
    }
  }, [businessId, version])

  // Data from the previous business is never shown while the new one loads
  const current = state.businessId === businessId
  return {
    data: current ? state.data : undefined,
    live: current && state.live,
    error: current ? state.error : '',
    refresh: () => setVersion((v) => v + 1),
  }
}
