import { describe, expect, it } from 'vitest'
import { accountTypes, type AccountType } from './domain'
import {
  evaluateEffectivePermissions,
  isPermittedForAccountType,
  permissionCatalogue,
  roleTemplates,
  type AuthorizationSubject,
} from './access-control'

const now = new Date('2026-11-26T00:00:00.000Z')

type RoleTemplate = (typeof roleTemplates)[number]

function makeSubject(
  accountType: AccountType,
  roles: AuthorizationSubject['roles'] = [],
  overrides: AuthorizationSubject['overrides'] = [],
): AuthorizationSubject {
  return {
    userId: `authorization-matrix-${accountType}`,
    accountType,
    status: 'active',
    roles,
    overrides,
    suspensions: [],
  }
}

function subjectWithRole(role: RoleTemplate, accountType: AccountType = role.audience) {
  return makeSubject(accountType, [{
    key: role.key,
    isActive: true,
    isReserved: role.reserved,
    audience: role.audience,
    permissions: role.permissions,
  }])
}

describe('seven-role effective authorization matrix', () => {
  for (const role of roleTemplates) {
    it(`grants exactly the declared permissions to ${role.key}`, () => {
      const effective = evaluateEffectivePermissions(subjectWithRole(role), now)

      expect(effective.blocked).toBeNull()
      expect(effective.isSuperAdmin).toBe(role.key === 'super_administrator')
      expect([...effective.permissions].sort()).toEqual([...role.permissions].sort())

      const ungranted = permissionCatalogue
        .filter(({ key }) => !role.permissions.includes(key))
        .map(({ key }) => key)
      expect(ungranted.every((key) => effective.denied.has(key))).toBe(true)
    })
  }

  for (const role of roleTemplates) {
    for (const accountType of accountTypes.filter((type) => type !== role.audience)) {
      it(`does not apply ${role.key} to a ${accountType} account`, () => {
        const effective = evaluateEffectivePermissions(subjectWithRole(role, accountType), now)

        expect(effective.isSuperAdmin).toBe(false)
        expect(effective.permissions.size).toBe(0)
      })
    }
  }

  for (const accountType of accountTypes) {
    it(`enforces the ${accountType} account-type ceiling against individual grants`, () => {
      const overrides = permissionCatalogue.map(({ key }) => ({
        permission: key,
        effect: 'grant' as const,
      }))
      const effective = evaluateEffectivePermissions(makeSubject(accountType, [], overrides), now)
      const expected = permissionCatalogue
        .filter((permission) => permission.accountTypes.includes(accountType))
        .map(({ key }) => key)
        .sort()

      expect([...effective.permissions].sort()).toEqual(expected)
    })
  }

  it('keeps service principals outside self-service, approval, deletion and administration powers', () => {
    const forbiddenActions = new Set(['approve', 'delete', 'manage', 'assign'])
    const forbiddenResources = new Set(['users', 'roles', 'audit_log', 'office'])

    for (const permission of permissionCatalogue) {
      const expected = permission.scope === 'office' &&
        !forbiddenActions.has(permission.action) &&
        !forbiddenResources.has(permission.resource)
      expect(isPermittedForAccountType(permission.key, 'service')).toBe(expected)
    }
  })
})
