import { useState, type FormEvent } from 'react'
import { sendPasswordResetEmail, updateProfile } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../useAuth'

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
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="subtitle">Manage your account.</p>
        </div>
      </div>

      <form className="card wide form-card" onSubmit={handleSave}>
        <h2>Profile</h2>
        <label>
          Display name
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </label>
        <label>
          Email
          <input type="email" value={user?.email ?? ''} disabled />
        </label>
        <p className="hint">
          Signed in with {[usesGoogle && 'Google', usesPassword && 'email & password'].filter(Boolean).join(' and ')}
        </p>

        {message && <p className="alert alert-info">{message}</p>}
        {error && <p className="alert alert-error">{error}</p>}

        <div className="form-actions">
          {usesPassword && (
            <button type="button" className="btn btn-ghost" onClick={handleResetPassword}>
              Change password
            </button>
          )}
          <button type="submit" className="btn btn-primary btn-auto" disabled={busy}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
