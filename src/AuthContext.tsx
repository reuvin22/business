import { useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { clearApiCache } from './api/client'
import { auth } from './firebase'
import { AuthContext, type AuthState } from './useAuth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true })

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        clearApiCache() // another user must never see the previous user's data
        setState({ user, loading: false })
      }),
    [],
  )

  // Firebase mutates the User object in place (e.g. updateProfile), so give
  // consumers a way to re-render with the latest values.
  const refresh = () => setState((s) => ({ ...s }))

  return <AuthContext.Provider value={{ ...state, refresh }}>{children}</AuthContext.Provider>
}
