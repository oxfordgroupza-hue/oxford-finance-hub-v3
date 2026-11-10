import { describe, expect, it } from 'vitest'
import {
  AuthorizationError,
  canBootstrapInitialSuperAdmin,
  SUPER_ADMIN_ROLE_KEY,
  allPermissionKeys,
  officePermissionKeys,
  assertPermission,
  canAccessOwnRecord,
  checkPermission,
  checkAssignRole,
  checkSaveCustomRole,
  checkSetOverride,
  checkSuspendUser,
  evaluateEffectivePermissions,
  isPermittedForAccountType,
  permissionCatalogue,
  roleTemplates,
  type AuthorizationSubject,
} from './access-control'

const now = new Date('2026-11-07T12:00:00.000Z')

function subject(overrides: Partial<AuthorizationSubject> = {}): AuthorizationSubject {
  return {
    userId: 'user-1',
    accountType: 'office',
    status: 'active',
    roles: [],
    overrides: [],
    suspensions: [],
    ...overrides,
  }
}

describe('access-control catalogue', () => {
  it('contains a non-empty, unique permission catalogue', () => {
    expect(permissionCatalogue.length).toBeGreaterThan(0)
    expect(new Set(allPermissionKeys).size).toBe(allPermissionKeys.length)
    expect(permissionCatalogue.every((p) => p.key.includes('.'))).toBe(true)
  })

  it('defines the reserved Super Administrator and standard account roles', () => {
    expect(roleTemplates.find((r) => r.key === SUPER_ADMIN_ROLE_KEY)?.reserved).toBe(true)
    expect(roleTemplates.map((r) => r.key)).toEqual(
      expect.arrayContaining(['administrator', 'office_staff', 'application_reviewer', 'customer_support', 'customer', 'partner']),
    )
  })

  it('keeps Customer Support limited to support operations', () => {
    const supportRole = roleTemplates.find((role) => role.key === 'customer_support')
    expect(supportRole?.permissions).toEqual(expect.arrayContaining([
      'office.view', 'support.view', 'support.create', 'support.edit', 'support.assign',
    ]))
    for (const key of [
      'applications.view', 'customers.view', 'customers.edit',
      'partners.view', 'notes.view', 'notes.create',
    ]) {
      expect(supportRole?.permissions).not.toContain(key)
    }
  })

  it('allows approved partners to access only their own applicant and referral permissions', () => {
    const partnerRole = roleTemplates.find((role) => role.key === 'partner')
    expect(partnerRole?.permissions).toEqual(expect.arrayContaining([
      'partner_referrals.view',
      'own_payouts.view',
      'own_applications.view',
      'own_applications.create',
      'own_documents.view',
      'own_documents.create',
      'own_documents.download',
    ]))
    expect(isPermittedForAccountType('own_applications.view', 'partner')).toBe(true)
    expect(isPermittedForAccountType('own_documents.download', 'partner')).toBe(true)
    expect(isPermittedForAccountType('own_payouts.view', 'partner')).toBe(true)
    expect(isPermittedForAccountType('settlements.view', 'partner')).toBe(false)
    expect(isPermittedForAccountType('settlements.create', 'partner')).toBe(false)
    expect(isPermittedForAccountType('applications.view', 'partner')).toBe(false)
    expect(isPermittedForAccountType('documents.download', 'partner')).toBe(false)
  })

  it('enforces account-type ceilings for office resources', () => {
    const officePermission = 'applications.view'
    expect(isPermittedForAccountType(officePermission, 'office')).toBe(true)
    expect(isPermittedForAccountType(officePermission, 'customer')).toBe(false)
    expect(isPermittedForAccountType(officePermission, 'partner')).toBe(false)
  })
})

describe('effective permission evaluation', () => {
  it('grants all office permissions to the reserved Super Administrator', () => {
    const result = evaluateEffectivePermissions(subject({
      roles: [{
        key: SUPER_ADMIN_ROLE_KEY,
        isActive: true,
        isReserved: true,
        audience: 'office',
        permissions: [],
      }],
    }), now)
    expect(result.isSuperAdmin).toBe(true)
    expect(result.permissions.has('office.view')).toBe(true)
    expect(result.permissions.has('roles.manage')).toBe(true)
    expect([...result.permissions].sort()).toEqual([...officePermissionKeys].sort())
  })

  it('does not let individual deny overrides remove the Super Administrator office baseline', () => {
    const result = evaluateEffectivePermissions(subject({
      roles: [{
        key: SUPER_ADMIN_ROLE_KEY,
        isActive: true,
        isReserved: true,
        audience: 'office',
        permissions: [],
      }],
      overrides: [
        { permission: 'applications.delete', effect: 'deny' },
        { permission: 'users.manage', effect: 'deny' },
      ],
    }), now)
    expect(result.permissions.has('applications.delete')).toBe(true)
    expect(result.permissions.has('users.manage')).toBe(true)
    expect([...result.permissions].sort()).toEqual([...officePermissionKeys].sort())
  })

  it('ignores inactive roles', () => {
    const result = evaluateEffectivePermissions(subject({
      roles: [{
        key: 'administrator',
        isActive: false,
        isReserved: false,
        audience: 'office',
        permissions: ['applications.view'],
      }],
    }), now)
    expect(result.permissions.has('applications.view')).toBe(false)
  })

  it('blocks disabled accounts', () => {
    const result = evaluateEffectivePermissions(subject({ status: 'disabled' }), now)
    expect(result.blocked).toBe('account_inactive')
    expect(result.permissions.size).toBe(0)
  })

  it('blocks currently suspended accounts', () => {
    const result = evaluateEffectivePermissions(subject({
      suspensions: [{ suspendedAt: new Date('2026-11-07T11:00:00.000Z') }],
    }), now)
    expect(result.blocked).toBe('suspended')
    expect(result.permissions.size).toBe(0)
  })

  it('allows a valid individual grant for an office account', () => {
    const result = evaluateEffectivePermissions(subject({
      overrides: [{ permission: 'applications.view', effect: 'grant' }],
    }), now)
    expect(result.permissions.has('applications.view')).toBe(true)
  })

  it('makes an explicit deny override role grants', () => {
    const result = evaluateEffectivePermissions(subject({
      roles: [{
        key: 'office_staff',
        isActive: true,
        isReserved: false,
        audience: 'office',
        permissions: ['applications.view'],
      }],
      overrides: [{ permission: 'applications.view', effect: 'deny' }],
    }), now)
    expect(result.permissions.has('applications.view')).toBe(false)
    expect(result.denied.get('applications.view')).toBe('explicit_deny')
  })

  it('prevents customers and partners from acquiring office permissions through overrides', () => {
    for (const accountType of ['customer', 'partner'] as const) {
      const result = evaluateEffectivePermissions(subject({
        accountType,
        overrides: [{ permission: 'applications.view', effect: 'grant' }],
      }), now)
      expect(result.permissions.has('applications.view')).toBe(false)
      expect(result.denied.get('applications.view')).toBe('account_type_ceiling')
    }
  })

  it('honours override expiry and revocation', () => {
    const result = evaluateEffectivePermissions(subject({
      overrides: [
        { permission: 'applications.view', effect: 'grant', expiresAt: new Date('2026-11-07T11:00:00.000Z') },
        { permission: 'applications.edit', effect: 'grant', revokedAt: new Date('2026-11-07T11:00:00.000Z') },
      ],
    }), now)
    expect(result.permissions.has('applications.view')).toBe(false)
    expect(result.permissions.has('applications.edit')).toBe(false)
  })

  it('reports unknown permissions as denied', () => {
    expect(checkPermission(subject(), 'not.a.permission', now)).toEqual({
      allowed: false,
      reason: 'unknown_permission',
    })
  })

  it('throws a typed authorization error when a permission is missing', () => {
    expect(() => assertPermission(subject(), 'applications.view', now)).toThrow(AuthorizationError)
  })

  it('checks self-service ownership without granting access to another user', () => {
    const current = subject({ userId: 'customer-1', accountType: 'customer' })
    expect(canAccessOwnRecord(current, 'customer-1')).toBe(true)
    expect(canAccessOwnRecord(current, 'customer-2')).toBe(false)
    expect(canAccessOwnRecord(current, null)).toBe(false)
  })
})


describe('administrative privilege-escalation guards', () => {
  const context = { now, activeSuperAdminCount: 2 }

  const limitedOfficeActor = subject({
    roles: [{
      key: 'limited_admin',
      isActive: true,
      isReserved: false,
      audience: 'office',
      permissions: ['roles.assign', 'roles.create', 'users.manage', 'applications.view'],
    }],
  })

  it('rejects assigning a role that grants permissions the actor does not hold', () => {
    const result = checkAssignRole(
      limitedOfficeActor,
      subject({ userId: 'user-2' }),
      {
        key: 'powerful_role',
        isSystem: false,
        isReserved: false,
        isActive: true,
        audience: 'office',
        permissions: ['applications.delete'],
      },
      context,
    )
    expect(result).toMatchObject({ ok: false, violation: 'escalation' })
  })

  it('rejects custom roles that add permissions beyond the actor’s own authority', () => {
    const result = checkSaveCustomRole(
      limitedOfficeActor,
      { key: 'new_role', audience: 'office', permissions: ['applications.delete'] },
      null,
      context,
    )
    expect(result).toMatchObject({ ok: false, violation: 'escalation' })
  })

  it('rejects an office permission override for a customer account', () => {
    const result = checkSetOverride(
      limitedOfficeActor,
      subject({ userId: 'customer-2', accountType: 'customer' }),
      { permission: 'applications.view', effect: 'grant' },
      context,
    )
    expect(result).toMatchObject({ ok: false, violation: 'audience_mismatch' })
  })

  it('prevents users from suspending themselves', () => {
    const actor = subject({
      roles: [{
        key: 'limited_admin',
        isActive: true,
        isReserved: false,
        audience: 'office',
        permissions: ['users.manage'],
      }],
    })
    expect(checkSuspendUser(actor, actor, context)).toMatchObject({ ok: false, violation: 'self_modification' })
  })
})


describe('initial Super Administrator bootstrap gate', () => {
  const base = {
    email: 'admin@example.co.za',
    bootstrapEmail: 'ADMIN@example.co.za',
    isDeployPreview: false,
    productionBootstrapEnabled: false,
    emailConfirmed: false,
    accountStatus: 'active' as const,
    hasSuperAdminAssignmentHistory: false,
    isSuspended: false,
  }

  it('allows the configured identity in an isolated Deploy Preview only after email confirmation', () => {
    expect(canBootstrapInitialSuperAdmin({ ...base, isDeployPreview: true, emailConfirmed: true })).toBe(true)
    expect(canBootstrapInitialSuperAdmin({ ...base, isDeployPreview: true, emailConfirmed: false })).toBe(false)
  })

  it('does not rebootstrap disabled or suspended accounts, or restore a previously revoked Super Administrator role', () => {
    expect(canBootstrapInitialSuperAdmin({ ...base, isDeployPreview: true, emailConfirmed: true, accountStatus: 'disabled' })).toBe(false)
    expect(canBootstrapInitialSuperAdmin({ ...base, isDeployPreview: true, emailConfirmed: true, isSuspended: true })).toBe(false)
    expect(canBootstrapInitialSuperAdmin({ ...base, isDeployPreview: true, emailConfirmed: true, hasSuperAdminAssignmentHistory: true })).toBe(false)
  })

  it('requires an explicit production flag and a confirmed email', () => {
    expect(canBootstrapInitialSuperAdmin({
      ...base,
      productionBootstrapEnabled: true,
      emailConfirmed: true,
    })).toBe(true)
    expect(canBootstrapInitialSuperAdmin({
      ...base,
      productionBootstrapEnabled: true,
      emailConfirmed: false,
    })).toBe(false)
    expect(canBootstrapInitialSuperAdmin({
      ...base,
      productionBootstrapEnabled: false,
      emailConfirmed: true,
    })).toBe(false)
  })

  it('rejects missing or mismatched configured email addresses', () => {
    expect(canBootstrapInitialSuperAdmin({ ...base, email: 'other@example.co.za', isDeployPreview: true, emailConfirmed: true })).toBe(false)
    expect(canBootstrapInitialSuperAdmin({ ...base, bootstrapEmail: '', isDeployPreview: true, emailConfirmed: true })).toBe(false)
    expect(canBootstrapInitialSuperAdmin({ ...base, email: null, isDeployPreview: true, emailConfirmed: true })).toBe(false)
  })
})
