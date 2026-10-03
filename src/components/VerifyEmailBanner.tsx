import { useState } from 'react'
import { sendEmailVerification } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../useAuth'

/**
 * Asks people who signed up with email and password to confirm their address (Google accounts already are).
 * A confirmed email proves the account belongs to whoever reads that inbox: nobody can pose as someone
 * else's address (this matters, for example, for platform admins).
 */
export default function VerifyEmailBanner() {
  const { user, refresh } = useAuth()
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  if (!user || user.emailVerified || !user.email) return null

  async function resend() {
    if (!auth.currentUser) return
    setState('sending')
    try {
      await sendEmailVerification(auth.currentUser)
      setState('sent')
    } catch {
      setState('error')
    }
  }

  async function checkAgain() {
    await auth.currentUser?.reload()
    await auth.currentUser?.getIdToken(true) // a new token says email_verified to the API too
    refresh()
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-line bg-warn-soft px-5 py-2.5 text-[0.88rem] text-heading max-sm:px-4">
      <span className="flex-1">
        Please confirm your email address <strong>{user.email}</strong>: open the link we sent you.
      </span>
      <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent underline" onClick={resend} disabled={state === 'sending'}>
        {state === 'sent' ? 'Sent! Check your inbox' : state === 'error' ? 'Could not send. Try again later' : state === 'sending' ? 'Sending…' : 'Send the link again'}
      </button>
      <button type="button" className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-accent underline" onClick={checkAgain}>
        I confirmed it
      </button>
    </div>
  )
}
