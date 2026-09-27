import { useState, type FormEvent } from 'react'
import { sendPasswordResetEmail, updateProfile } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../useAuth'
import { cx, ui } from '../styles'
import { PageHeader } from '../components/ui'

export default function SettingsPage() {
  const { user, refresh } = useAuth()
  const [name, setName] = useState(user?.displayName ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const usesPassword = user?.providerData.some((p) => p.providerId === 'password')
  const usesGoogle = user?.providerData.some((p) => p.providerId === 'google.com')

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setBusy(true)
    try {
      await updateProfile(user!, { displayName: name.trim() })
      refresh()
      setMessage('Profile updated.')
    } catch {
      setError('Could not update your profile. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function handleResetPassword() {
    setMessage('')
    setError('')
    try {
      await sendPasswordResetEmail(auth, user!.email!)
      setMessage(`Password reset email sent to ${user!.email}.`)
    } catch {
      setError('Could not send the reset email. Please try again.')
    }
  }

  return (
    <div className={ui.page}>
      <PageHeader title="Settings" subtitle="Manage your account." />

      <form className={cx(ui.formCard, 'max-w-160')} onSubmit={handleSave}>
        <h2 className={ui.h2}>Profile</h2>
        <label className={ui.label}>
          Display name
          <input className={ui.input} type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </label>
        <label className={ui.label}>
          Email
          <input className={ui.input} type="email" value={user?.email ?? ''} disabled />
        </label>
        <p className={ui.hint}>
          Signed in with {[usesGoogle && 'Google', usesPassword && 'email & password'].filter(Boolean).join(' and ')}
        </p>

        {message && <p className={ui.alertInfo}>{message}</p>}
        {error && <p className={ui.alertError}>{error}</p>}

        <div className={ui.formActions}>
          {usesPassword && (
            <button type="button" className={ui.btnGhost} onClick={handleResetPassword}>
              Change password
            </button>
          )}
          <button type="submit" className={ui.btnPrimary} disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
