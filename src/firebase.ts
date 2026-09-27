import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// The env variable behind each setting, so the setup screen can say exactly what is missing
const ENV_NAMES = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const

export const missingFirebaseSettings = (Object.keys(ENV_NAMES) as (keyof typeof ENV_NAMES)[])
  .filter((key) => !firebaseConfig[key])
  .map((key) => ENV_NAMES[key])

export const isFirebaseConfigured = missingFirebaseSettings.length === 0

// Only initialize when configured; App shows setup instructions otherwise.
export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null!
export const auth = isFirebaseConfigured ? getAuth(app) : null!

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
