import { initializeApp, setLogLevel } from 'firebase/app'
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from 'firebase/auth'
import { connectDatabaseEmulator, getDatabase } from 'firebase/database'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // The Realtime Database (live chat). Firebase Console > Realtime Database > the address at the top.
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://my-business-5bcad-default-rtdb.asia-southeast1.firebasedatabase.app',
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
// Only used to LISTEN to live stock (see hooks/useLiveInventory.ts). Every change goes through the API.
export const db = isFirebaseConfigured ? getFirestore(app) : null!
// Only used to LISTEN to the chats (see hooks/useRealtime.ts). Messages are sent through the API.
export const rtdb = isFirebaseConfigured ? getDatabase(app) : null!

export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

// Local development only: VITE_FIREBASE_EMULATORS=true uses the Firebase emulators
// (Auth on port 9099, Firestore on 8080, Realtime Database on 9000) instead of the real project.
// See the backend README.
if (isFirebaseConfigured && import.meta.env.VITE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectDatabaseEmulator(rtdb, '127.0.0.1', 9000)
}

// No Firebase messages in the browser console (errors still reach our code and are shown on the page)
setLogLevel('silent')
