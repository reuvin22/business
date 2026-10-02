import { useEffect, useRef, useState } from 'react'

type LoadState<T> = { key: string; data: T | undefined; error: string }

/**
 * Loads data from the API when the component shows, and again whenever `deps` change.
 *
 *   const { data, loading, error, reload } = useLoad(() => listProducts(businessId), [businessId])
 *
 * `await reload()` waits until the new data is on the screen, so a button can keep spinning
 * until the table actually shows the change.
 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [version, setVersion] = useState(0)
  const key = JSON.stringify(deps) + ':' + version
  const [state, setState] = useState<LoadState<T>>({ key: '', data: undefined, error: '' })
  // Callers waiting for a reload, by the version they asked for
  const waiting = useRef(new Map<number, (() => void)[]>())

  useEffect(() => {
    let cancelled = false
    const done = () => {
      for (const [asked, resolvers] of waiting.current) {
        if (asked <= version) {
          resolvers.forEach((resolve) => resolve())
          waiting.current.delete(asked)
        }
      }
    }
    // A newer load replaced this one: it will answer everyone waiting
    load().then(
      (data) => {
        if (cancelled) return
        setState({ key, data, error: '' })
        done()
      },
      (err: Error) => {
        if (cancelled) return
        setState((old) => ({ key, data: old.data, error: err.message }))
        done()
      },
    )
    return () => {
      cancelled = true
    }
    // `load` changes on every render; `key` already covers everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  function reload(): Promise<void> {
    return new Promise((resolve) => {
      setVersion((current) => {
        const next = current + 1
        waiting.current.set(next, [...(waiting.current.get(next) ?? []), resolve])
        return next
      })
    })
  }

  return {
    data: state.data,
    error: state.error,
    loading: state.key !== key,
    reload,
  }
}
