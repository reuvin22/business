import { limitToLast, onValue, orderByChild, query, ref } from 'firebase/database'
import { useEffect, useState } from 'react'
import { rtdb } from '../firebase'
import { decryptFields, type RoomKeys } from '../utils/crypto'

// How many of the newest messages a chat shows (the same as the API)
const MESSAGE_LIMIT = 200

type State<T> = { key: string | null; data: T | undefined; error: string }

/**
 * The newest messages at a path in the Realtime Database, oldest first, updating live.
 * What was said is encrypted there: `roomKeys` (from the API, one per key version) decrypt it.
 * Pass null to wait (e.g. until the API has granted access).
 */
export function useRealtimeMessages<T extends { createdAt: number }>(path: string | null, roomKeys: RoomKeys | undefined) {
  return useRealtime<(T & { id: string })[]>(path, (value) =>
    Promise.all(
      Object.entries((value ?? {}) as Record<string, T>).map(([id, item]) => decryptFields({ ...item, id }, roomKeys)),
    ).then((items) => items.sort((a, b) => a.createdAt - b.createdAt)),
  )
}

/** Any value at a path in the Realtime Database, updating live. Pass null to wait. */
export function useRealtimeValue<T>(path: string | null) {
  return useRealtime<T | null>(path, (value) => (value ?? null) as T | null)
}

function useRealtime<T>(path: string | null, read: (value: unknown) => T | Promise<T>) {
  const [state, setState] = useState<State<T>>({ key: path, data: undefined, error: '' })

  useEffect(() => {
    if (!path) return
    // A list of messages: only the newest ones (ordered by createdAt, indexed in database.rules.json)
    const target = path.endsWith('/messages')
      ? query(ref(rtdb, path), orderByChild('createdAt'), limitToLast(MESSAGE_LIMIT))
      : ref(rtdb, path)
    let latest = 0 // decrypting takes a moment: only the newest snapshot is shown
    return onValue(
      target,
      (snapshot) => {
        const turn = ++latest
        Promise.resolve(read(snapshot.val())).then(
          (data) => turn === latest && setState({ key: path, data, error: '' }),
          (error: Error) => turn === latest && setState({ key: path, data: undefined, error: error.message }),
        )
      },
      (error) =>
        setState({
          key: path,
          data: undefined,
          error: error.message.includes('permission_denied')
            ? "You can't read this chat. If the database rules were just deployed, reload the page."
            : error.message,
        }),
    )
    // read is the same function on every render of a given caller
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path])

  const current = state.key === path
  return { data: current ? state.data : undefined, error: current ? state.error : '' }
}
