import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { cx, ui } from '../styles'

type Mode = 'signin' | 'signup'

function friendlyError(err: unknown): string {
  if (!(err instanceof FirebaseError)) return 'Something went wrong. Please try again.'
  switch (err.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return ''
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Please allow popups and try again.'
    case 'auth/invalid-api-key':
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'Firebase is not configured yet. Add your keys to .env.local.'
    default:
      return err.message
  }
}

export default function Login() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  const goNext = () => navigate('/dashboard/business', { replace: true })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')

    if (mode === 'signup' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        if (name.trim()) await updateProfile(cred.user, { displayName: name.trim() })
      }
      goNext()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setInfo('')
    setBusy(true)
    try {
      await signInWithPopup(auth, googleProvider)
      goNext()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  async function handleReset() {
    setError('')
    setInfo('')
    if (!email) {
      setError('Enter your email above, then click "Forgot password?" again.')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email)
      setInfo('Password reset email sent. Check your inbox.')
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
    setInfo('')
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-6">
      <div className={cx(ui.card, 'max-w-100 shadow-xl')}>
        <h1 className={ui.h1}>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h1>
        <p className={cx(ui.subtitle, 'mb-6')}>
          {mode === 'signin'
            ? 'Sign in to continue building your business.'
            : 'Get started in less than a minute.'}
        </p>

        <button type="button" className={cx(ui.btnGhost, 'w-full py-2.5 text-[15px]')} onClick={handleGoogle} disabled={busy}>
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-[0.85rem] text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
          <span>or</span>
        </div>

        <form className={ui.form} onSubmit={handleSubmit} noValidate>
          {mode === 'signup' && (
            <label className={ui.label}>
              Full name
              <input className={ui.input}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="Jane Doe"
              />
            </label>
          )}

          <label className={ui.label}>
            Email
            <input className={ui.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className={ui.label}>
            <span className="flex items-center justify-between">
              Password
              {mode === 'signin' && (
                <button type="button" className={ui.link} onClick={handleReset}>
                  Forgot password?
                </button>
              )}
            </span>
            <input className={ui.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </label>

          {mode === 'signup' && (
            <label className={ui.label}>
              Confirm password
              <input className={ui.input}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="••••••••"
                required
              />
            </label>
          )}

          {error && <p className={ui.alertError}>{error}</p>}
          {info && <p className={ui.alertInfo}>{info}</p>}

          <button type="submit" className={cx(ui.btnPrimary, 'w-full')} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-center text-[0.9rem] text-muted">
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" className={ui.link} onClick={() => switchMode('signup')}>
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className={ui.link} onClick={() => switchMode('signin')}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
