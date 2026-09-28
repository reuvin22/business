import { useState } from 'react'

/**
 * Tracks whether an action (save, add, delete...) is still running, for BusyButton.
 *
 *   const [saving, run] = useBusy()
 *   async function handleSubmit(e: FormEvent) {
 *     e.preventDefault()
 *     await run(async () => { ... })
 *   }
 *
 * `run` ignores a second call while the first one is still running (no double submits).
 */
export function useBusy() {
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>) {
    if (busy) return
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  return [busy, run] as const
}

/**
 * Like useBusy, for a group of buttons that share one action (e.g. Approve / Reject):
 * `running` is the name of the action in progress, so only that button spins.
 *
 *   const [running, run] = useRunning()
 *   <BusyButton busy={running === 'approve'} disabled={running !== ''} onClick={() => run('approve', approve)}>
 */
export function useRunning() {
  const [running, setRunning] = useState('')

  async function run(name: string, action: () => Promise<unknown>) {
    if (running) return
    setRunning(name)
    try {
      await action()
    } finally {
      setRunning('')
    }
  }

  return [running, run] as const
}
