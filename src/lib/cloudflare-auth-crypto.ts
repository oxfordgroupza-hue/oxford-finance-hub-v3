// Cloudflare Workers WebCrypto rejects PBKDF2 iteration counts above 100,000.
// Keep this at the runtime-supported ceiling so registration and login use the same derivation.
const PASSWORD_ITERATIONS = 100_000
const PASSWORD_KEY_LENGTH = 256
const PASSWORD_SALT_BYTES = 16
const SESSION_TOKEN_BYTES = 32
const encoder = new TextEncoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password).buffer as ArrayBuffer, 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt.buffer as ArrayBuffer, iterations }, material, PASSWORD_KEY_LENGTH)
  return new Uint8Array(bits)
}

/** Versioned PBKDF2 password digest. Salt is unique and stored separately from the digest. */
export async function hashPassword(password: string): Promise<{
  algorithm: 'pbkdf2-sha256'
  iterations: number
  salt: string
  hash: string
}> {
  if (password.length < 12 || password.length > 1024) throw new Error('Password must contain between 12 and 1024 characters.')
  const salt = crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES))
  const digest = await derivePasswordHash(password, salt, PASSWORD_ITERATIONS)
  return {
    algorithm: 'pbkdf2-sha256',
    iterations: PASSWORD_ITERATIONS,
    salt: toBase64Url(salt),
    hash: toBase64Url(digest),
  }
}

/** Compare a candidate against a stored digest without an early-exit byte comparison. */
export async function verifyPassword(password: string, stored: {
  algorithm: string
  iterations: number
  salt: string
  hash: string
}): Promise<boolean> {
  if (stored.algorithm !== 'pbkdf2-sha256' || !Number.isInteger(stored.iterations) ||
      stored.iterations < 100_000 || stored.iterations > 100_000) return false
  let salt: Uint8Array
  let expected: Uint8Array
  try {
    salt = fromBase64Url(stored.salt)
    expected = fromBase64Url(stored.hash)
  } catch {
    return false
  }
  if (salt.length !== PASSWORD_SALT_BYTES || expected.length !== PASSWORD_KEY_LENGTH / 8) return false
  const actual = await derivePasswordHash(password, salt, stored.iterations)
  let difference = 0
  for (let index = 0; index < expected.length; index++) difference |= expected[index]! ^ actual[index]!
  return difference === 0
}

/** Generate a high-entropy opaque bearer token; persist only its digest. */
export function createOpaqueToken(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(SESSION_TOKEN_BYTES)))
}

export async function hashOpaqueToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token).buffer as ArrayBuffer)
  return toBase64Url(new Uint8Array(digest))
}

