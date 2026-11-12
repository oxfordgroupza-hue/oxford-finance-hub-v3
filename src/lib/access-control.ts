/**
 * Oxford Finance Hub — the single shared permission catalogue and authorisation engine.
 *
 * Everything here is pure and deterministic: no I/O, no clock reads (callers pass `now`),
 * no imports beyond the import-free domain types. The same module is used by:
 *   - the database seed migration (`scripts/generate-access-seed.ts`), so the `permissions`
 *     and system `roles` tables always mirror this catalogue;
 *   - server-side authorisation (M3), which loads a subject from the database and calls
 *     `evaluateEffectivePermissions` / `assertPermission`;
 *   - the administrative mutation guards (`check*`) that stop privilege escalation.
 *
 * Client code may import it to *display* permissions, but a client-side check is never an
 * authorisation decision. The server re-evaluates on every protected operation.
 *
 * Precedence (highest first):
 *   1. Account status / active suspension  → no permissions at all.
 *   2. Account-type ceiling                → customer/partner accounts can never hold office
 *                                            permissions; service accounts never hold
 *                                            approve/delete/manage or user/role/audit powers.
 *   3. Explicit individual deny            → removes a permission whatever roles grant.
 *   4. Explicit individual grant           → adds a permission (still capped by 2).
 *   5. Active role permissions             → the baseline.
 */
import type { AccountStatus, AccountType } from './domain'

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

/**
 * One-time Super Administrator bootstrap for the explicitly configured identity.
 * It must never override a disabled/suspended account or silently restore a role
 * that an administrator previously revoked. The approved Deploy Preview or production context
 * requires the exact configured identity and a confirmed email.
 */
export function canBootstrapInitialSuperAdmin(input: {
  email: string | null | undefined
  bootstrapEmail: string | null | undefined
  isDeployPreview: boolean
  isProduction: boolean
  hasActiveSuperAdminElsewhere: boolean
  emailConfirmed: boolean
  accountStatus: AccountStatus
  hasSuperAdminAssignmentHistory: boolean
  isSuspended: boolean
}): boolean {
  const email = input.email?.trim().toLowerCase()
  const bootstrapEmail = input.bootstrapEmail?.trim().toLowerCase()
  if (!email || !bootstrapEmail || email !== bootstrapEmail) return false
  if (input.accountStatus === 'disabled' || input.hasSuperAdminAssignmentHistory || input.isSuspended) return false
  // Email confirmation is mandatory in every environment. Preview isolation is
  // not a substitute for proving control of the designated administrator email.
  if (!input.emailConfirmed) return false
  if (input.hasActiveSuperAdminElsewhere) return false
  return input.isDeployPreview || input.isProduction
}

export const permissionActions = [
  'view',
  'create',
  'edit',
  'delete',
  'approve',
  'assign',
  'download',
  'export',
  'manage',
] as const
export type PermissionAction = (typeof permissionActions)[number]

export const actionLabels: Record<PermissionAction, string> = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  assign: 'Assign',
  download: 'Download',
  export: 'Export',
  manage: 'Manage',
}

/** `office` resources operate across every customer's records. `self_service` ones are always scoped to the caller's own records. */
export type PermissionScope = 'office' | 'self_service'

export interface ResourceDefinition {
  resource: string
  label: string
  scope: PermissionScope
  actions: readonly PermissionAction[]
  /** Account types that may ever hold permissions on this resource. */
  accountTypes: readonly AccountType[]
  description: string
}

const OFFICE: readonly AccountType[] = ['office', 'service']

export const resourceDefinitions = [
  // ---- Office resources -------------------------------------------------
  { resource: 'applications', label: 'Applications', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'assign', 'export'],
    description: 'All finance applications. "Approve" means recording a finance provider decision — never an automated decision.' },
  { resource: 'documents', label: 'Application documents', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'download'],
    description: 'Sensitive supporting documents. "Approve" marks a document as verified.' },
  { resource: 'pdf_packs', label: 'PDF application packs', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'download'], description: 'Generated OBG-APP PDF packs.' },
  { resource: 'notes', label: 'Internal notes', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'edit', 'delete'], description: 'Internal office notes on applications.' },
  { resource: 'customers', label: 'Customers', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'edit', 'delete', 'export'], description: 'Customer profiles and preferences.' },
  { resource: 'directory', label: 'Restricted people directory', scope: 'office', accountTypes: OFFICE,
    actions: ['view'], description: 'Limited contact and account lookup only; excludes financial information and private documents.' },
  { resource: 'identity_records', label: 'Sensitive identity numbers', scope: 'office', accountTypes: OFFICE,
    actions: ['view'], description: 'View full South African ID and passport numbers in authorised applicant search results.' },
  { resource: 'partners', label: 'Partners', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'edit', 'delete', 'approve', 'export'], description: 'Partner registrations, approval and referral codes.' },
  { resource: 'support', label: 'Support inbox', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'edit', 'delete', 'assign'], description: 'Contact, support and complaint requests.' },
  { resource: 'products', label: 'Finance products', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'edit', 'delete', 'manage'], description: 'Finance categories and document checklists.' },
  { resource: 'content', label: 'Site content', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'edit', 'delete', 'approve'], description: 'Managed site content. "Approve" publishes.' },
  { resource: 'reports', label: 'Reports', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'export'], description: 'Reporting dashboards and exports.' },
  { resource: 'audit_log', label: 'Audit log', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'export'], description: 'Read-only audit trails. No permission exists to edit or delete audit records.' },
  { resource: 'integrations', label: 'Integrations', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'edit', 'manage'], description: 'OneDrive, email and other integration settings and operations.' },
  { resource: 'notifications', label: 'Notifications', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'manage'], description: 'Notification records and delivery log.' },
  { resource: 'users', label: 'Users', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'edit', 'manage'], description: '"Manage" covers suspension, reinstatement and individual permission overrides.' },
  { resource: 'roles', label: 'Roles', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'edit', 'assign', 'manage'], description: '"Manage" covers activating and deactivating roles.' },
  { resource: 'office', label: 'Office workspace', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'manage'], description: '"View" grants entry to /office. "Manage" covers security-sensitive workspace settings.' },

  { resource: 'settlements', label: 'Settlements', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'approve'], description: 'Confirmed funder settlements and immutable Oxford fee snapshots.' },
  { resource: 'credit_assessments', label: 'Credit assessments', scope: 'office', accountTypes: OFFICE,
    actions: ['view', 'create', 'edit', 'export'], description: 'Private, human-reviewed internal evidence assessments. No automated lending decision is made.' },
  // ---- Self-service resources (always limited to the caller's own records) --
  { resource: 'own_applications', label: 'My applications', scope: 'self_service', accountTypes: ['customer'],
    actions: ['view', 'create', 'edit'], description: 'The customer’s own drafts and applications.' },
  { resource: 'own_documents', label: 'My documents', scope: 'self_service', accountTypes: ['customer'],
    actions: ['view', 'create', 'download'], description: 'Documents on the customer’s own applications. Upload is additionally gated by private-bucket verification and the preview enable flag.' },
  { resource: 'own_profile', label: 'My profile', scope: 'self_service', accountTypes: ['customer', 'partner'],
    actions: ['view', 'edit'], description: 'The caller’s own profile and preferences.' },
  { resource: 'own_support', label: 'My support requests', scope: 'self_service', accountTypes: ['customer', 'partner'],
    actions: ['view', 'create'], description: 'The caller’s own support requests.' },
  { resource: 'partner_referrals', label: 'My referrals', scope: 'self_service', accountTypes: ['partner'],
    actions: ['view', 'create', 'export'], description: 'Referral links and referral status for the partner’s own organisation only.' },
  { resource: 'own_payouts', label: 'My partner payouts', scope: 'self_service', accountTypes: ['partner'],
    actions: ['view'], description: 'Confirmed net payout amounts for the partner’s own organisation only.' },
] as const satisfies readonly ResourceDefinition[]

type ResourceDefs = (typeof resourceDefinitions)[number]
export type PermissionResource = ResourceDefs['resource']
/** A permission key, e.g. `applications.view`. Only real resource/action pairs type-check. */
export type PermissionKey = { [R in ResourceDefs as R['resource']]: `${R['resource']}.${R['actions'][number]}` }[PermissionResource]

export interface PermissionDefinition {
  key: PermissionKey
  resource: PermissionResource
  action: PermissionAction
  scope: PermissionScope
  label: string
  /** Account types that may ever hold this specific permission. */
  accountTypes: AccountType[]
}

/** Service (automation/AI) principals may never hold these, so AI cannot approve, delete or administer anything. */
const SERVICE_FORBIDDEN_ACTIONS: readonly PermissionAction[] = ['approve', 'delete', 'manage', 'assign']
const SERVICE_FORBIDDEN_RESOURCES: readonly string[] = ['users', 'roles', 'audit_log', 'office']

function allowedAccountTypes(def: ResourceDefinition, action: PermissionAction): AccountType[] {
  return def.accountTypes.filter(
    (t) => t !== 'service' || (!SERVICE_FORBIDDEN_ACTIONS.includes(action) && !SERVICE_FORBIDDEN_RESOURCES.includes(def.resource)),
  )
}

export const permissionCatalogue: readonly PermissionDefinition[] = (resourceDefinitions as readonly ResourceDefinition[]).flatMap((def) =>
  def.actions.map((action) => ({
    key: `${def.resource}.${action}` as PermissionKey,
    resource: def.resource as PermissionResource,
    action,
    scope: def.scope,
    label: `${actionLabels[action]} ${def.label.toLowerCase()}`,
    accountTypes: allowedAccountTypes(def, action),
  })),
)

/** Flat key list used by admin tooling, seeds and catalogue integrity tests. */
export const allPermissionKeys: readonly PermissionKey[] = permissionCatalogue.map((permission) => permission.key)

const catalogueByKey = new Map<string, PermissionDefinition>(permissionCatalogue.map((p) => [p.key, p]))

export const isPermissionKey = (key: string): key is PermissionKey => catalogueByKey.has(key)
export const getPermission = (key: string) => catalogueByKey.get(key)
export const permissionKey = <R extends PermissionResource>(resource: R, action: PermissionAction) => `${resource}.${action}` as PermissionKey

export const officePermissionKeys: readonly PermissionKey[] = permissionCatalogue.filter((p) => p.scope === 'office').map((p) => p.key)

/** True if an account of this type may ever hold the permission (the hard ceiling). */
export function isPermittedForAccountType(key: string, accountType: AccountType): boolean {
  return catalogueByKey.get(key)?.accountTypes.includes(accountType) ?? false
}

/* ------------------------------------------------------------------ */
/* Role templates                                                       */
/* ------------------------------------------------------------------ */

export const SUPER_ADMIN_ROLE_KEY = 'super_administrator'

export interface RoleTemplate {
  key: string
  name: string
  description: string
  /** The account type this role can be assigned to. */
  audience: AccountType
  /** Reserved roles cannot be edited, deactivated or assigned except by a Super Administrator. */
  reserved: boolean
  permissions: readonly PermissionKey[]
}

const all = (resource: PermissionResource): PermissionKey[] =>
  permissionCatalogue.filter((p) => p.resource === resource).map((p) => p.key)

export const roleTemplates: readonly RoleTemplate[] = [
  {
    key: SUPER_ADMIN_ROLE_KEY,
    name: 'Super Administrator',
    description: 'Reserved. Holds every office permission and is the only role that can manage other Super Administrators.',
    audience: 'office',
    reserved: true,
    // Always the complete office catalogue. Not stored in role_permissions, so it can never drift or be edited.
    permissions: officePermissionKeys,
  },
  {
    key: 'administrator',
    name: 'Administrator',
    description: 'Runs the office: users, roles, partners, products and content. Cannot change security-sensitive workspace settings or Super Administrators.',
    audience: 'office',
    reserved: false,
    permissions: officePermissionKeys.filter((k) => k !== 'office.manage'),
  },
  {
    key: 'office_staff',
    name: 'Office staff',
    description: 'Processes applications end to end, including assignment and documents.',
    audience: 'office',
    reserved: false,
    permissions: [
      'office.view', 'directory.view',
      'applications.view', 'applications.create', 'applications.edit', 'applications.assign',
      'documents.view', 'documents.create', 'documents.download',
      'pdf_packs.view', 'pdf_packs.create', 'pdf_packs.download',
      'notes.view', 'notes.create', 'notes.edit',
      'customers.view', 'customers.create', 'customers.edit',
      'identity_records.view',
      'partners.view',
      'support.view', 'support.create', 'support.edit', 'support.assign',
      'products.view', 'content.view', 'reports.view',
      'notifications.view', 'notifications.create',
    ],
  },
  {
    key: 'application_reviewer',
    name: 'Application reviewer',
    description: 'Reviews assigned applications, verifies documents and records provider outcomes. Cannot assign work.',
    audience: 'office',
    reserved: false,
    permissions: [
      'office.view', 'directory.view',
      'applications.view', 'applications.edit', 'applications.approve',
      'credit_assessments.view', 'credit_assessments.create', 'credit_assessments.edit',
      'documents.view', 'documents.download', 'documents.approve',
      'pdf_packs.view', 'pdf_packs.download',
      'notes.view', 'notes.create', 'notes.edit',
      'customers.view', 'reports.view',
      'identity_records.view',
    ],
  },
  {
    key: 'customer_support',
    name: 'Customer support',
    description: 'Handles support requests and customer communication, with access to a restricted contact directory. Financial information, private documents and full identity numbers are excluded.',
    audience: 'office',
    reserved: false,
    permissions: [
      'office.view',
      'support.view', 'support.create', 'support.edit', 'support.assign',
      'directory.view',
      'notifications.view',
    ],
  },
  {
    key: 'customer',
    name: 'Customer',
    description: 'Self-service access to the customer’s own applications, documents, profile and support requests.',
    audience: 'customer',
    reserved: false,
    permissions: [...all('own_applications'), ...all('own_documents'), ...all('own_profile'), ...all('own_support')],
  },
  {
    key: 'partner',
    name: 'Partner',
    description: 'Self-service access to the partner’s own referrals, profile and support requests.',
    audience: 'partner',
    reserved: false,
    permissions: [...all('partner_referrals'), ...all('own_payouts'), ...all('own_profile'), ...all('own_support')],
  },
]

export const getRoleTemplate = (key: string) => roleTemplates.find((r) => r.key === key)
export const isSystemRoleKey = (key: string) => roleTemplates.some((r) => r.key === key)

/* ------------------------------------------------------------------ */
/* Subjects and evaluation                                             */
/* ------------------------------------------------------------------ */

export interface SubjectRole {
  key: string
  isActive: boolean
  isReserved: boolean
  audience: AccountType
  /** Permission keys attached to the role. Ignored for the reserved Super Administrator role. */
  permissions: readonly string[]
}

export interface SubjectOverride {
  permission: string
  effect: 'grant' | 'deny'
  expiresAt?: Date | null
  revokedAt?: Date | null
}

export interface SubjectSuspension {
  suspendedAt: Date
  endsAt?: Date | null
  liftedAt?: Date | null
}

/** Everything needed to decide what a user can do. Loaded from the database server-side. */
export interface AuthorizationSubject {
  userId: string
  accountType: AccountType
  status: AccountStatus
  roles: readonly SubjectRole[]
  overrides: readonly SubjectOverride[]
  suspensions: readonly SubjectSuspension[]
}

export type DenialReason = 'account_inactive' | 'suspended' | 'account_type_ceiling' | 'explicit_deny' | 'not_granted' | 'unknown_permission'

export interface EffectivePermissions {
  permissions: ReadonlySet<PermissionKey>
  isSuperAdmin: boolean
  /** When the subject is blocked entirely. */
  blocked: null | 'account_inactive' | 'suspended'
  /** Why each catalogue permission is not held — powers the "effective permissions" view. */
  denied: ReadonlyMap<PermissionKey, DenialReason>
  /** Where each held permission came from. */
  sources: ReadonlyMap<PermissionKey, ReadonlyArray<string>>
}

const isCurrent = (expiresAt: Date | null | undefined, revokedAt: Date | null | undefined, now: Date) =>
  !revokedAt && (!expiresAt || expiresAt.getTime() > now.getTime())

export function isSuspended(suspensions: readonly SubjectSuspension[], now: Date): boolean {
  return suspensions.some(
    (s) => s.suspendedAt.getTime() <= now.getTime() && !s.liftedAt && (!s.endsAt || s.endsAt.getTime() > now.getTime()),
  )
}

/** A role only counts if it is active and its audience matches the account type. */
const roleApplies = (role: SubjectRole, accountType: AccountType) => role.isActive && role.audience === accountType

export function isSuperAdmin(subject: AuthorizationSubject): boolean {
  return (
    subject.accountType === 'office' &&
    subject.roles.some((r) => r.key === SUPER_ADMIN_ROLE_KEY && r.isReserved && roleApplies(r, subject.accountType))
  )
}

/**
 * Computes a subject's effective permissions. Deterministic: the same subject and `now`
 * always produce the same result, independent of the order of roles or overrides.
 */
export function evaluateEffectivePermissions(subject: AuthorizationSubject, now: Date): EffectivePermissions {
  const denied = new Map<PermissionKey, DenialReason>()
  const sources = new Map<PermissionKey, string[]>()
  const blocked = subject.status !== 'active' ? 'account_inactive' : isSuspended(subject.suspensions, now) ? 'suspended' : null
  const superAdmin = isSuperAdmin(subject)

  if (blocked) {
    for (const p of permissionCatalogue) denied.set(p.key, blocked)
    return { permissions: new Set(), isSuperAdmin: superAdmin, blocked, denied, sources }
  }

  const add = (key: PermissionKey, source: string) => {
    const list = sources.get(key) ?? []
    if (!list.includes(source)) list.push(source)
    sources.set(key, list)
  }

  for (const role of subject.roles) {
    if (!roleApplies(role, subject.accountType)) continue
    const keys = role.key === SUPER_ADMIN_ROLE_KEY && role.isReserved ? officePermissionKeys : role.permissions
    for (const key of keys) if (isPermissionKey(key)) add(key, `role:${role.key}`)
  }

  const currentOverrides = subject.overrides.filter((o) => isCurrent(o.expiresAt, o.revokedAt, now) && isPermissionKey(o.permission))
  for (const o of currentOverrides) if (o.effect === 'grant') add(o.permission as PermissionKey, 'override:grant')
  const explicitDenies = new Set(currentOverrides.filter((o) => o.effect === 'deny').map((o) => o.permission))

  // A valid, active Super Administrator always receives the complete office catalogue.
  // Individual deny overrides cannot silently reduce this reserved role's baseline.
  if (superAdmin) {
    for (const key of officePermissionKeys) add(key, 'role:super_administrator')
  }

  const held = new Set<PermissionKey>()
  for (const p of permissionCatalogue) {
    if (!isPermittedForAccountType(p.key, subject.accountType)) {
      denied.set(p.key, 'account_type_ceiling')
      sources.delete(p.key)
    } else if (!superAdmin && explicitDenies.has(p.key)) {
      denied.set(p.key, 'explicit_deny')
      sources.delete(p.key)
    } else if (sources.has(p.key)) {
      held.add(p.key)
    } else {
      denied.set(p.key, 'not_granted')
    }
  }

  // Sort sources so output is stable regardless of input ordering.
  for (const [k, v] of sources) sources.set(k, [...v].sort())
  return { permissions: held, isSuperAdmin: superAdmin, blocked: null, denied, sources }
}

export interface PermissionDecision {
  allowed: boolean
  reason?: DenialReason
}

export function checkPermission(subject: AuthorizationSubject, key: string, now: Date): PermissionDecision {
  if (!isPermissionKey(key)) return { allowed: false, reason: 'unknown_permission' }
  const eff = evaluateEffectivePermissions(subject, now)
  return eff.permissions.has(key) ? { allowed: true } : { allowed: false, reason: eff.denied.get(key) ?? 'not_granted' }
}

export const hasPermission = (subject: AuthorizationSubject, key: string, now: Date) => checkPermission(subject, key, now).allowed

export class AuthorizationError extends Error {
  readonly status = 403
  readonly code: DenialReason | GuardViolation
  constructor(code: DenialReason | GuardViolation, message?: string) {
    super(message ?? `Not authorised (${code}).`)
    this.name = 'AuthorizationError'
    this.code = code
  }
}

export function assertPermission(subject: AuthorizationSubject, key: PermissionKey, now: Date): void {
  const d = checkPermission(subject, key, now)
  if (!d.allowed) throw new AuthorizationError(d.reason!, `Missing permission ${key} (${d.reason}).`)
}

/**
 * Self-service record ownership. Self-service permissions only ever apply to the caller's
 * own records; office permissions apply across records. Use alongside `checkPermission`.
 */
export function canAccessOwnRecord(subject: AuthorizationSubject, ownerUserId: string | null | undefined): boolean {
  return !!ownerUserId && ownerUserId === subject.userId
}

/* ------------------------------------------------------------------ */
/* Administrative mutation guards (privilege-escalation prevention)     */
/* ------------------------------------------------------------------ */

export type GuardViolation =
  | 'actor_blocked'
  | 'missing_permission'
  | 'self_modification'
  | 'reserved_role'
  | 'system_role_immutable'
  | 'super_admin_protected'
  | 'last_super_admin'
  | 'escalation'
  | 'audience_mismatch'
  | 'role_inactive'
  | 'unknown_permission'

export type GuardResult = { ok: true } | { ok: false; violation: GuardViolation; detail?: string }

const ok: GuardResult = { ok: true }
const fail = (violation: GuardViolation, detail?: string): GuardResult => ({ ok: false, violation, detail })

export interface GuardContext {
  now: Date
  /** Number of active, non-suspended Super Administrators (for the last-Super-Administrator rule). */
  activeSuperAdminCount: number
}

export interface RoleRecord {
  key: string
  isSystem: boolean
  isReserved: boolean
  isActive: boolean
  audience: AccountType
  permissions: readonly string[]
}

function actorBase(actor: AuthorizationSubject, required: PermissionKey, ctx: GuardContext) {
  const eff = evaluateEffectivePermissions(actor, ctx.now)
  if (eff.blocked) return { eff, result: fail('actor_blocked', eff.blocked) }
  if (!eff.permissions.has(required)) return { eff, result: fail('missing_permission', required) }
  return { eff, result: null }
}

/** Permissions a role would confer — the Super Administrator role always confers all office permissions. */
const rolePermissionSet = (role: RoleRecord): readonly string[] => (role.isReserved && role.key === SUPER_ADMIN_ROLE_KEY ? officePermissionKeys : role.permissions)

/** Assigning a role to a user. */
export function checkAssignRole(actor: AuthorizationSubject, target: AuthorizationSubject, role: RoleRecord, ctx: GuardContext): GuardResult {
  const { eff, result } = actorBase(actor, 'roles.assign', ctx)
  if (result) return result
  if (actor.userId === target.userId) return fail('self_modification', 'Nobody can change their own roles.')
  if (!role.isActive) return fail('role_inactive')
  if (role.audience !== target.accountType) return fail('audience_mismatch', `A ${role.audience} role cannot be given to a ${target.accountType} account.`)
  if (role.isReserved && !eff.isSuperAdmin) return fail('reserved_role', 'Only a Super Administrator can assign a reserved role.')
  if (isSuperAdmin(target) && !eff.isSuperAdmin) return fail('super_admin_protected')
  if (!eff.isSuperAdmin) {
    const beyond = rolePermissionSet(role).filter((k) => !eff.permissions.has(k as PermissionKey))
    if (beyond.length) return fail('escalation', `Role grants permissions the actor does not hold: ${beyond.join(', ')}`)
  }
  return ok
}

/** Removing a role from a user. */
export function checkRevokeRole(actor: AuthorizationSubject, target: AuthorizationSubject, role: RoleRecord, ctx: GuardContext): GuardResult {
  const { eff, result } = actorBase(actor, 'roles.assign', ctx)
  if (result) return result
  if (actor.userId === target.userId) return fail('self_modification')
  if (role.isReserved && !eff.isSuperAdmin) return fail('reserved_role')
  if (isSuperAdmin(target) && !eff.isSuperAdmin) return fail('super_admin_protected')
  if (role.key === SUPER_ADMIN_ROLE_KEY && isSuperAdmin(target) && ctx.activeSuperAdminCount <= 1) return fail('last_super_admin')
  return ok
}

/** Creating a custom role, or changing a custom role's permissions. Pass `existing` for edits. */
export function checkSaveCustomRole(
  actor: AuthorizationSubject,
  proposed: Pick<RoleRecord, 'key' | 'audience' | 'permissions'>,
  existing: RoleRecord | null,
  ctx: GuardContext,
): GuardResult {
  const { eff, result } = actorBase(actor, existing ? 'roles.edit' : 'roles.create', ctx)
  if (result) return result
  if (existing?.isReserved || proposed.key === SUPER_ADMIN_ROLE_KEY) return fail('reserved_role')
  if (existing?.isSystem || (!existing && isSystemRoleKey(proposed.key))) return fail('system_role_immutable', 'System role templates are maintained in code and migrations.')
  if (existing && existing.audience !== proposed.audience) return fail('audience_mismatch', 'A role’s audience cannot change.')
  for (const k of proposed.permissions) {
    if (!isPermissionKey(k)) return fail('unknown_permission', k)
    if (!isPermittedForAccountType(k, proposed.audience)) return fail('audience_mismatch', `${k} cannot be held by ${proposed.audience} accounts.`)
  }
  const added = proposed.permissions.filter((k) => !existing?.permissions.includes(k))
  if (!eff.isSuperAdmin) {
    const beyond = added.filter((k) => !eff.permissions.has(k as PermissionKey))
    if (beyond.length) return fail('escalation', `Cannot add permissions the actor does not hold: ${beyond.join(', ')}`)
  }
  // Holding the role yourself and widening it is a self-grant.
  if (existing && added.length && actor.roles.some((r) => r.key === existing.key)) return fail('self_modification', 'You cannot widen a role you hold.')
  return ok
}

/** Activating or deactivating a role. */
export function checkSetRoleActive(actor: AuthorizationSubject, role: RoleRecord, active: boolean, ctx: GuardContext): GuardResult {
  const { eff, result } = actorBase(actor, 'roles.manage', ctx)
  if (result) return result
  if (role.isReserved) return fail('reserved_role')
  if (role.isSystem && !eff.isSuperAdmin) return fail('system_role_immutable', 'Only a Super Administrator can deactivate a system role.')
  if (active && actor.roles.some((r) => r.key === role.key)) return fail('self_modification', 'You cannot reactivate a role you hold.')
  if (active && !eff.isSuperAdmin) {
    const beyond = rolePermissionSet(role).filter((k) => !eff.permissions.has(k as PermissionKey))
    if (beyond.length) return fail('escalation')
  }
  return ok
}

/** Creating an individual grant or deny override. */
export function checkSetOverride(
  actor: AuthorizationSubject,
  target: AuthorizationSubject,
  override: { permission: string; effect: 'grant' | 'deny' },
  ctx: GuardContext,
): GuardResult {
  const { eff, result } = actorBase(actor, 'users.manage', ctx)
  if (result) return result
  if (!isPermissionKey(override.permission)) return fail('unknown_permission', override.permission)
  if (actor.userId === target.userId) return fail('self_modification', 'Nobody can change their own permissions.')
  if (isSuperAdmin(target) && !eff.isSuperAdmin) return fail('super_admin_protected')
  if (override.effect === 'grant') {
    if (!isPermittedForAccountType(override.permission, target.accountType))
      return fail('audience_mismatch', `${override.permission} can never be held by a ${target.accountType} account.`)
    if (!eff.isSuperAdmin && !eff.permissions.has(override.permission)) return fail('escalation')
  }
  return ok
}

/** Revoking an existing override. Removing a deny is a grant in effect, so it is checked like one. */
export function checkRevokeOverride(
  actor: AuthorizationSubject,
  target: AuthorizationSubject,
  override: { permission: string; effect: 'grant' | 'deny' },
  ctx: GuardContext,
): GuardResult {
  return checkSetOverride(actor, target, { permission: override.permission, effect: override.effect === 'deny' ? 'grant' : 'deny' }, ctx)
}

export function checkSuspendUser(actor: AuthorizationSubject, target: AuthorizationSubject, ctx: GuardContext): GuardResult {
  const { eff, result } = actorBase(actor, 'users.manage', ctx)
  if (result) return result
  if (actor.userId === target.userId) return fail('self_modification')
  if (isSuperAdmin(target)) {
    if (!eff.isSuperAdmin) return fail('super_admin_protected')
    if (ctx.activeSuperAdminCount <= 1) return fail('last_super_admin')
  }
  return ok
}

export function checkReinstateUser(actor: AuthorizationSubject, target: AuthorizationSubject, ctx: GuardContext): GuardResult {
  const { eff, result } = actorBase(actor, 'users.manage', ctx)
  if (result) return result
  if (actor.userId === target.userId) return fail('self_modification')
  if (isSuperAdmin(target) && !eff.isSuperAdmin) return fail('super_admin_protected')
  return ok
}

/** Changing an account's type (e.g. customer → office) is an escalation path, so only a Super Administrator may do it. */
export function checkChangeAccountType(actor: AuthorizationSubject, target: AuthorizationSubject, ctx: GuardContext): GuardResult {
  const { eff, result } = actorBase(actor, 'users.manage', ctx)
  if (result) return result
  if (actor.userId === target.userId) return fail('self_modification')
  if (!eff.isSuperAdmin) return fail('super_admin_protected', 'Only a Super Administrator can change an account type.')
  return ok
}

export function assertGuard(result: GuardResult): void {
  if (!result.ok) throw new AuthorizationError(result.violation, result.detail)
}
