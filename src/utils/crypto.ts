// Decrypts what is said in the live chats and the notifications. The API encrypts it in the Realtime
// Database (AES-256-GCM) and gives each user the keys of the rooms they may read (a team channel, the market,
// a conversation, the live activity feed). Everything else comes from the API already decrypted.
//
// An encrypted value is "enc1:" + base64url(12-byte nonce + ciphertext + 16-byte tag), with JSON inside
// (the same format as app/core/crypto.py in the API).

const PREFIX = 'enc1:'
const NONCE_BYTES = 12

const keys = new Map<string, Promise<CryptoKey>>()

function bytes(base64: string): Uint8Array<ArrayBuffer> {
  const normal = base64.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normal + '='.repeat((4 - (normal.length % 4)) % 4))
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

/** The room key (base64, from the API) as a Web Crypto key; made once per key. */
function cryptoKey(key: string): Promise<CryptoKey> {
  let found = keys.get(key)
  if (!found) {
    found = crypto.subtle.importKey('raw', bytes(key), 'AES-GCM', false, ['decrypt'])
    keys.set(key, found)
  }
  return found
}

export const isEncrypted = (value: unknown): value is string => typeof value === 'string' && value.startsWith(PREFIX)

/** One value. Values that are not encrypted (saved before encryption) come back as they are. */
export async function decryptValue(value: unknown, key: string): Promise<unknown> {
  if (!isEncrypted(value)) return value
  const raw = bytes(value.slice(PREFIX.length))
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: raw.slice(0, NONCE_BYTES) },
    await cryptoKey(key),
    raw.slice(NONCE_BYTES),
  )
  return JSON.parse(new TextDecoder().decode(plain))
}

// What the API encrypts in a message or an activity (app/core/realtime.py SECRET_FIELDS)
const SECRET_FIELDS = ['message', 'attachments', 'order', 'title', 'detail'] as const

/**
 * A message (or activity) with what was said decrypted. Without the key, or if a value cannot be read,
 * it shows a placeholder instead of the encrypted text.
 */
export async function decryptFields<T extends object>(item: T, key: string | undefined): Promise<T> {
  const record = item as Record<string, unknown>
  const opened: Record<string, unknown> = { ...record }
  await Promise.all(
    SECRET_FIELDS.filter((field) => isEncrypted(record[field])).map(async (field) => {
      try {
        if (!key) throw new Error('no key')
        opened[field] = await decryptValue(record[field], key)
      } catch {
        opened[field] = field === 'attachments' ? [] : field === 'order' ? null : '🔒 This message could not be decrypted.'
      }
    }),
  )
  return opened as T
}
