const DATABASE_NAME = 'oxford-finance-hub-private-drafts'
const STORE_NAME = 'encrypted-drafts'
const DRAFT_ID = 'active-application-v1'

interface StoredDraft {
  key: CryptoKey
  iv: ArrayBuffer
  ciphertext: ArrayBuffer
  stepIndex: number
  savedAt: string
}

export interface RestoredBrowserDraft<T> {
  form: T
  stepIndex: number
  savedAt: string
}

function openDraftDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Secure browser draft storage is unavailable.'))
      return
    }
    const request = indexedDB.open(DATABASE_NAME, 1)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open secure browser draft storage.'))
    request.onblocked = () => reject(new Error('Secure browser draft storage is busy in another tab.'))
  })
}

async function readStoredDraft(): Promise<StoredDraft | undefined> {
  const database = await openDraftDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly')
      const request = transaction.objectStore(STORE_NAME).get(DRAFT_ID)
      request.onsuccess = () => resolve(request.result as StoredDraft | undefined)
      request.onerror = () => reject(request.error ?? new Error('Could not read the saved application draft.'))
    })
  } finally {
    database.close()
  }
}

/**
 * Persist the draft using AES-GCM in the browser. The non-extractable CryptoKey
 * is stored by IndexedDB as a CryptoKey object; the form itself is never written
 * to localStorage or IndexedDB in plaintext.
 */
export async function saveEncryptedBrowserDraft<T>(form: T, stepIndex: number): Promise<void> {
  const database = await openDraftDatabase()
  try {
    const existing = await new Promise<StoredDraft | undefined>((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(DRAFT_ID)
      request.onsuccess = () => resolve(request.result as StoredDraft | undefined)
      request.onerror = () => reject(request.error ?? new Error('Could not read the browser encryption key.'))
    })
    const key = existing?.key ?? await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const plaintext = new TextEncoder().encode(JSON.stringify(form))
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
    const record: StoredDraft = {
      key,
      iv: iv.buffer.slice(0),
      ciphertext,
      stepIndex,
      savedAt: new Date().toISOString(),
    }
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(record, DRAFT_ID)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the encrypted application draft.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Saving the encrypted application draft was interrupted.'))
    })
  } finally {
    database.close()
  }
}

export async function loadEncryptedBrowserDraft<T>(): Promise<RestoredBrowserDraft<T> | null> {
  const record = await readStoredDraft()
  if (!record) return null
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(record.iv) },
      record.key,
      record.ciphertext,
    )
    const form = JSON.parse(new TextDecoder().decode(plaintext)) as T
    return { form, stepIndex: record.stepIndex, savedAt: record.savedAt }
  } catch {
    await clearEncryptedBrowserDraft()
    return null
  }
}

export async function clearEncryptedBrowserDraft(): Promise<void> {
  const database = await openDraftDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).delete(DRAFT_ID)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not clear the encrypted application draft.'))
    })
  } finally {
    database.close()
  }
}
