import { describe, expect, it } from 'vitest'
import { isActivePartnerAccount } from './partner-account-validation'

describe('partner account eligibility', () => {
  it('accepts only active partner accounts', () => {
    expect(isActivePartnerAccount({ accountType: 'partner', status: 'active' })).toBe(true)
  })

  it('rejects inactive, suspended, customer and missing accounts', () => {
    expect(isActivePartnerAccount({ accountType: 'partner', status: 'disabled' })).toBe(false)
    expect(isActivePartnerAccount({ accountType: 'partner', status: 'suspended' })).toBe(false)
    expect(isActivePartnerAccount({ accountType: 'customer', status: 'active' })).toBe(false)
    expect(isActivePartnerAccount(null)).toBe(false)
    expect(isActivePartnerAccount(undefined)).toBe(false)
  })
})
