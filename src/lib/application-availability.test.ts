import { describe, expect, it } from 'vitest'
import { getApplicationMode } from './application-availability'

describe('getApplicationMode', () => {
  it('allows the approved Preview host only when the server flag is enabled', () => {
    expect(getApplicationMode(
      'cloudflare-preview',
      'https://launch-v3-reconciled-2026-11-26-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/apply',
      'true',
    )).toBe('preview')
  })

  it('allows the canonical production host only when the production server flag is enabled', () => {
    expect(getApplicationMode(
      'cloudflare-production',
      'https://finance.oxfordbusinessgroup.co.za/apply',
      'true',
    )).toBe('production')
  })

  it('fails closed when the flag is disabled', () => {
    expect(getApplicationMode('cloudflare-production', 'https://finance.oxfordbusinessgroup.co.za/apply', 'false')).toBeNull()
  })

  it('fails closed on an unapproved production hostname', () => {
    expect(getApplicationMode('cloudflare-production', 'https://attacker.example/apply', 'true')).toBeNull()
  })

  it('fails closed when the runtime context does not match the host', () => {
    expect(getApplicationMode('cloudflare-preview', 'https://finance.oxfordbusinessgroup.co.za/apply', 'true')).toBeNull()
  })
})
