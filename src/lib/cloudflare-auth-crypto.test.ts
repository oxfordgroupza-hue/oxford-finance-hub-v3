import { describe, expect, it } from 'vitest'
import { createOpaqueToken, hashOpaqueToken, hashPassword, verifyPassword } from './cloudflare-auth-crypto'

describe('Cloudflare authentication cryptography', () => {
  it('uses unique salts and a Cloudflare-supported PBKDF2 iteration count', async () => {
    const first = await hashPassword('A sufficiently long passphrase 1!')
    const second = await hashPassword('A sufficiently long passphrase 1!')
    expect(first.algorithm).toBe('pbkdf2-sha256')
    expect(first.iterations).toBe(100_000)
    expect(first.salt).not.toBe(second.salt)
    expect(first.hash).not.toBe(second.hash)
  })

  it('verifies only the matching password', async () => {
    const stored = await hashPassword('Another long and secure passphrase 2!')
    await expect(verifyPassword('Another long and secure passphrase 2!', stored)).resolves.toBe(true)
    await expect(verifyPassword('incorrect passphrase', stored)).resolves.toBe(false)
  })

  it('rejects malformed and unsupported password records', async () => {
    await expect(verifyPassword('whatever', { algorithm: 'plain', iterations: 1, salt: '', hash: '' })).resolves.toBe(false)
    await expect(hashPassword('short')).rejects.toThrow()
  })

  it('creates high-entropy opaque tokens and stores only stable digests', async () => {
    const first = createOpaqueToken()
    const second = createOpaqueToken()
    expect(first).not.toBe(second)
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(await hashOpaqueToken(first)).toBe(await hashOpaqueToken(first))
    expect(await hashOpaqueToken(first)).not.toBe(await hashOpaqueToken(second))
  })
})
