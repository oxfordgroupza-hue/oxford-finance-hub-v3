import { eq, inArray, sql } from 'drizzle-orm'
import { db } from '../db/index'
import { financeProducts, permissions, rolePermissions, roles } from '../db/schema'
import { permissionCatalogue, roleTemplates } from '../src/lib/access-control'
import { financeCategories, getDocumentChecklist } from '../src/lib/finance-config'

/**
 * Idempotently seed the permission catalogue, built-in roles and finance products.
 * This script never creates a user or assigns the Super Administrator role.
 */
async function seed() {
  await db.insert(permissions).values(permissionCatalogue.map((permission) => ({
    key: permission.key,
    resource: permission.resource,
    action: permission.action,
    scope: permission.scope,
    label: permission.label,
    accountTypes: [...permission.accountTypes],
  }))).onConflictDoUpdate({
    target: permissions.key,
    set: {
      resource: sql.raw('excluded.resource'),
      action: sql.raw('excluded.action'),
      scope: sql.raw('excluded.scope'),
      label: sql.raw('excluded.label'),
      accountTypes: sql.raw('excluded.account_types'),
    },
  })

  for (const template of roleTemplates) {
    await db.insert(roles).values({
      key: template.key,
      name: template.name,
      description: template.description,
      audience: template.audience,
      isSystem: true,
      isReserved: template.reserved,
      isActive: true,
    }).onConflictDoUpdate({
      target: roles.key,
      set: {
        name: template.name,
        description: template.description,
        audience: template.audience,
        isSystem: true,
        isReserved: template.reserved,
      },
    })
  }

  const systemRoles = await db.select({ id: roles.id, key: roles.key }).from(roles).where(eq(roles.isSystem, true))
  const systemRoleIds = systemRoles.map((role) => role.id)
  if (systemRoleIds.length) {
    await db.delete(rolePermissions).where(inArray(rolePermissions.roleId, systemRoleIds))
  }

  const permissionRows = await db.select({ id: permissions.id, key: permissions.key }).from(permissions)
  const permissionIds = new Map(permissionRows.map((permission) => [permission.key, permission.id]))
  const roleIds = new Map(systemRoles.map((role) => [role.key, role.id]))
  const assignments = roleTemplates
    .filter((role) => !role.reserved)
    .flatMap((role) => role.permissions.map((permissionKey) => {
      const roleId = roleIds.get(role.key)
      const permissionId = permissionIds.get(permissionKey)
      if (!roleId || !permissionId) throw new Error(`Missing seeded role or permission: ${role.key} / ${permissionKey}`)
      return { roleId, permissionId }
    }))

  if (assignments.length) await db.insert(rolePermissions).values(assignments).onConflictDoNothing()

  for (const category of financeCategories) {
    await db.insert(financeProducts).values({
      category: category.id,
      name: category.name,
      description: category.description,
      documentChecklist: [
        ...getDocumentChecklist('individual', category.id).map((item) => ({ ...item, applicantType: 'individual' })),
        ...getDocumentChecklist('business', category.id).map((item) => ({ ...item, applicantType: 'business' })),
      ],
      isActive: true,
    }).onConflictDoUpdate({
      target: financeProducts.category,
      set: {
        name: category.name,
        description: category.description,
        documentChecklist: [
          ...getDocumentChecklist('individual', category.id).map((item) => ({ ...item, applicantType: 'individual' })),
          ...getDocumentChecklist('business', category.id).map((item) => ({ ...item, applicantType: 'business' })),
        ],
      },
    })
  }

  return { permissions: permissionCatalogue.length, systemRoles: roleTemplates.length, financeProducts: financeCategories.length }
}

seed()
  .then((summary) => {
    process.stdout.write(`Seeded ${summary.permissions} permissions, ${summary.systemRoles} system roles and ${summary.financeProducts} finance products.\\n`)
    process.exitCode = 0
  })
  .catch((error: unknown) => {
    process.stderr.write(`Access-control seed failed: ${error instanceof Error ? error.message : String(error)}\\n`)
    process.exitCode = 1
  })
