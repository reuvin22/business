import { createContext, useContext } from 'react'
import type { User } from 'firebase/auth'

export type AuthState = { user: User | null; loading: boolean }
export type AuthContextValue = AuthState & { refresh: () => void }

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  refresh: () => {},
})

export const useAuth = () => useContext(AuthContext)
