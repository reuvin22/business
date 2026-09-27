import { useEffect, useState } from 'react'

type LoadState<T> = { key: string; data: T | undefined; error: string }

/**
 * Loads data from the API when the component shows, and again whenever `deps` change.
 *
 *   const { data, loading, error, reload } = useLoad(() => listProducts(businessId), [businessId])
 */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [version, setVersion] = useState(0)
  const key = JSON.stringify(deps) + ':' + version
  const [state, setState] = useState<LoadState<T>>({ key: '', data: undefined, error: '' })

  useEffect(() => {
    let cancelled = false
    load().then(
      (data) => !cancelled && setState({ key, data, error: '' }),
      (err: Error) => !cancelled && setState((old) => ({ key, data: old.data, error: err.message })),
    )
    return () => {
      cancelled = true
    }
    // `load` changes on every render; `key` already covers everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return {
    data: state.data,
    error: state.error,
    loading: state.key !== key,
    reload: () => setVersion((v) => v + 1),
  }
}
