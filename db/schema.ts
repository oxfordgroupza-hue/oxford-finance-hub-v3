import { sql } from 'drizzle-orm'
import {
  bigint, boolean, check, date, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid,
} from 'drizzle-orm/pg-core'
import {
  accountStatuses, accountTypes, applicationStatuses, applicantTypeIds, consentTypes,
  documentStatuses, financeCategoryIds, partnerStatuses, priorities, supportChannels, supportStatuses,
} from '../src/lib/domain'

const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
const accountTypeEnum = pgEnum('account_type', accountTypes)
const accountStatusEnum = pgEnum('account_status', accountStatuses)
const applicantTypeEnum = pgEnum('applicant_type', applicantTypeIds)
const financeCategoryEnum = pgEnum('finance_category', financeCategoryIds)
const applicationStatusEnum = pgEnum('application_status', applicationStatuses)
const priorityEnum = pgEnum('priority', priorities)
const documentStatusEnum = pgEnum('document_status', documentStatuses)
const partnerStatusEnum = pgEnum('partner_status', partnerStatuses)
const supportChannelEnum = pgEnum('support_channel', supportChannels)
const supportStatusEnum = pgEnum('support_status', supportStatuses)
const consentTypeEnum = pgEnum('consent_type', consentTypes)

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  identityId: text('identity_id').notNull(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  accountType: accountTypeEnum('account_type').notNull(),
  status: accountStatusEnum('status').default('invited').notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  ...timestamps(),
}, (t) => [uniqueIndex('users_identity_id_uq').on(t.identityId), uniqueIndex('users_email_uq').on(t.email), index('users_account_type_status_idx').on(t.accountType, t.status)])

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  audience: accountTypeEnum('audience').notNull(),
  isSystem: boolean('is_system').default(false).notNull(),
  isReserved: boolean('is_reserved').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps(),
}, (t) => [uniqueIndex('roles_key_uq').on(t.key)])

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull(),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  scope: text('scope').notNull(),
  label: text('label').notNull(),
  accountTypes: jsonb('account_types').$type<string[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex('permissions_key_uq').on(t.key), index('permissions_resource_action_idx').on(t.resource, t.action)])

export const rolePermissions = pgTable('role_permissions', {
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex('role_permissions_role_permission_uq').on(t.roleId, t.permissionId)])

export const staffRoles = pgTable('staff_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  roleId: uuid('role_id').notNull().references(() => roles.id, { onDelete: 'restrict' }),
  assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => [uniqueIndex('staff_roles_active_uq').on(t.userId, t.roleId).where(sql`${t.revokedAt} is null`)])

export const userPermissionOverrides = pgTable('user_permission_overrides', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
  effect: text('effect').$type<'grant' | 'deny'>().notNull(),
  reason: text('reason'),
  grantedBy: uuid('granted_by').references(() => users.id, { onDelete: 'set null' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  ...timestamps(),
}, (t) => [check('user_permission_overrides_effect_check', sql`${t.effect} in ('grant', 'deny')`), index('user_permission_overrides_user_idx').on(t.userId), index('user_permission_overrides_expiry_idx').on(t.expiresAt)])

export const userSuspensions = pgTable('user_suspensions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  suspendedBy: uuid('suspended_by').references(() => users.id, { onDelete: 'set null' }),
  suspendedAt: timestamp('suspended_at', { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }),
  liftedBy: uuid('lifted_by').references(() => users.id, { onDelete: 'set null' }),
  liftedAt: timestamp('lifted_at', { withTimezone: true }),
}, (t) => [index('user_suspensions_user_active_idx').on(t.userId, t.liftedAt)])

export const permissionAuditLog = pgTable('permission_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  affectedUserId: uuid('affected_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  recordId: text('record_id'),
  previousValue: jsonb('previous_value'),
  newValue: jsonb('new_value'),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('permission_audit_log_actor_idx').on(t.actorUserId), index('permission_audit_log_affected_idx').on(t.affectedUserId), index('permission_audit_log_created_idx').on(t.createdAt)])

export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  applicantType: applicantTypeEnum('applicant_type').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  businessName: text('business_name'),
  phone: text('phone'),
  profile: jsonb('profile').$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps(),
}, (t) => [uniqueIndex('customers_user_id_uq').on(t.userId), index('customers_name_idx').on(t.lastName, t.firstName)])

export const financeProducts = pgTable('finance_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  category: financeCategoryEnum('category').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  documentChecklist: jsonb('document_checklist').$type<unknown[]>().notNull().default([]),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  ...timestamps(),
}, (t) => [uniqueIndex('finance_products_category_uq').on(t.category)])

/** Super Admin-managed cascading catalogue: industry -> asset category -> asset type. */
export const assetIndustries = pgTable('asset_industries', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  ...timestamps(),
}, (t) => [uniqueIndex('asset_industries_name_uq').on(t.name)])

export const assetCategories = pgTable('asset_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  industryId: uuid('industry_id').notNull().references(() => assetIndustries.id, { onDelete: 'restrict' }),
  financeCategory: financeCategoryEnum('finance_category').notNull(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  ...timestamps(),
}, (t) => [
  uniqueIndex('asset_categories_industry_name_uq').on(t.industryId, t.name),
  index('asset_categories_industry_idx').on(t.industryId),
])

export const assetTypes = pgTable('asset_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').notNull().references(() => assetCategories.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  isActive: boolean('is_active').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  ...timestamps(),
}, (t) => [
  uniqueIndex('asset_types_category_name_uq').on(t.categoryId, t.name),
  index('asset_types_category_idx').on(t.categoryId),
])

/** Office-created intake remains separate until the applicant verifies and claims it. */
export const applicationIntakes = pgTable('application_intakes', {
  id: uuid('id').defaultRandom().primaryKey(),
  reference: text('reference').notNull(),
  applicantEmail: text('applicant_email').notNull(),
  applicantType: applicantTypeEnum('applicant_type').notNull(),
  applicantName: text('applicant_name').notNull(),
  phone: text('phone'),
  category: financeCategoryEnum('category').notNull(),
  assetTypeId: uuid('asset_type_id').references(() => assetTypes.id, { onDelete: 'set null' }),
  industryNameSnapshot: text('industry_name_snapshot'),
  assetCategoryNameSnapshot: text('asset_category_name_snapshot'),
  assetTypeNameSnapshot: text('asset_type_name_snapshot'),
  financeAmount: integer('finance_amount'),
  partnerRegistrationId: uuid('partner_registration_id').references(() => partnerRegistrations.id, { onDelete: 'set null' }),
  creatorUserId: uuid('creator_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  tokenHash: text('token_hash').notNull(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }).notNull(),
  invitationSentAt: timestamp('invitation_sent_at', { withTimezone: true }),
  claimedAt: timestamp('claimed_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'restrict' }),
  applicationId: uuid('application_id').references(() => financeApplications.id, { onDelete: 'restrict' }),
  status: text('status').default('pending_invitation').notNull(),
  ...timestamps(),
}, (t) => [
  uniqueIndex('application_intakes_reference_uq').on(t.reference),
  uniqueIndex('application_intakes_token_hash_uq').on(t.tokenHash),
  index('application_intakes_email_status_idx').on(t.applicantEmail, t.status),
  index('application_intakes_creator_idx').on(t.creatorUserId, t.createdAt),
  check('application_intakes_status_check', sql`${t.status} in ('pending_invitation', 'invitation_sent', 'claimed', 'expired', 'revoked')`),
  check('application_intakes_claim_consistency_check', sql`(${t.status} = 'claimed' and ${t.claimedAt} is not null and ${t.customerId} is not null and ${t.applicationId} is not null) or (${t.status} <> 'claimed' and ${t.claimedAt} is null and ${t.customerId} is null and ${t.applicationId} is null)`),
])

export const financeApplications = pgTable('finance_applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  reference: text('reference').notNull(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  creatorUserId: uuid('creator_user_id').references(() => users.id, { onDelete: 'set null' }),
  applicantType: applicantTypeEnum('applicant_type').notNull(),
  category: financeCategoryEnum('category').notNull(),
  status: applicationStatusEnum('status').default('Submitted').notNull(),
  priority: priorityEnum('priority').default('Medium').notNull(),
  financeAmount: integer('finance_amount'),
  assetDescription: text('asset_description'),
  assetTypeId: uuid('asset_type_id').references(() => assetTypes.id, { onDelete: 'set null' }),
  industryNameSnapshot: text('industry_name_snapshot'),
  assetCategoryNameSnapshot: text('asset_category_name_snapshot'),
  assetTypeNameSnapshot: text('asset_type_name_snapshot'),
  referralCode: text('referral_code'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  providerDecision: text('provider_decision'),
  applicationData: jsonb('application_data').$type<Record<string, unknown>>().notNull().default({}),
  ...timestamps(),
}, (t) => [uniqueIndex('finance_applications_reference_uq').on(t.reference), check('finance_applications_provider_decision_check', sql`${t.providerDecision} is null or ${t.providerDecision} in ('approved', 'declined', 'withdrawn')`), index('finance_applications_customer_idx').on(t.customerId), index('finance_applications_status_idx').on(t.status), index('finance_applications_referral_idx').on(t.referralCode)])

export const financeDrafts = pgTable('finance_drafts', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
  idempotencyKey: text('idempotency_key').notNull(),
  applicantType: applicantTypeEnum('applicant_type').notNull(),
  category: financeCategoryEnum('category').notNull(),
  assetTypeId: uuid('asset_type_id').references(() => assetTypes.id, { onDelete: 'set null' }),
  industryNameSnapshot: text('industry_name_snapshot'),
  assetCategoryNameSnapshot: text('asset_category_name_snapshot'),
  assetTypeNameSnapshot: text('asset_type_name_snapshot'),
  referralCode: text('referral_code'),
  draftData: jsonb('draft_data').$type<Record<string, unknown>>().notNull().default({}),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  ...timestamps(),
}, (t) => [uniqueIndex('finance_drafts_idempotency_key_uq').on(t.idempotencyKey), index('finance_drafts_customer_idx').on(t.customerId)])

export const applicationPacks = pgTable('application_packs', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => financeApplications.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  storageKey: text('storage_key'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
}, (t) => [index('application_packs_application_idx').on(t.applicationId)])

export const applicationDocuments = pgTable('application_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => financeApplications.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  documentType: text('document_type').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  status: documentStatusEnum('status').default('Outstanding').notNull(),
  provider: text('provider'),
  providerItemId: text('provider_item_id'),
  storagePath: text('storage_path'),
  checksum: text('checksum'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }),
  verifiedBy: uuid('verified_by').references(() => users.id, { onDelete: 'set null' }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps(),
}, (t) => [check('application_documents_size_bytes_check', sql`${t.sizeBytes} >= 0`), index('application_documents_application_idx').on(t.applicationId), index('application_documents_customer_idx').on(t.customerId)])

export const applicationStatusHistory = pgTable('application_status_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => financeApplications.id, { onDelete: 'cascade' }),
  fromStatus: text('from_status'),
  toStatus: applicationStatusEnum('to_status').notNull(),
  changedBy: uuid('changed_by').references(() => users.id, { onDelete: 'set null' }),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('application_status_history_application_idx').on(t.applicationId, t.createdAt)])


/** Versioned Super Administrator-controlled internal credit scoring rules. */
export const creditAssessmentRules = pgTable('credit_assessment_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  version: integer('version').notNull(),
  status: text('status').notNull().default('draft'),
  verifiedIncomeAndStability: integer('verified_income_and_stability').notNull(),
  affordabilityAndDisposableIncome: integer('affordability_and_disposable_income').notNull(),
  existingFinancialCommitments: integer('existing_financial_commitments').notNull(),
  bankStatementBehaviour: integer('bank_statement_behaviour').notNull(),
  employmentOrBusinessStability: integer('employment_or_business_stability').notNull(),
  documentConsistencyAndVerification: integer('document_consistency_and_verification').notNull(),
  rationale: text('rationale').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'restrict' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('credit_assessment_rules_version_positive_check', sql`${t.version} > 0`),
  check('credit_assessment_rules_status_check', sql`${t.status} in ('draft', 'active', 'superseded')`),
  check('credit_assessment_rules_rationale_check', sql`length(btrim(${t.rationale})) >= 10`),
  check('credit_assessment_rules_approval_check', sql`
    (${t.status} = 'active' and ${t.approvedBy} is not null and ${t.approvedAt} is not null)
    or (${t.status} = 'draft' and ${t.approvedBy} is null and ${t.approvedAt} is null)
    or ${t.status} = 'superseded'
  `),
  check('credit_assessment_rules_weights_check', sql`
    ${t.verifiedIncomeAndStability} >= 0 and
    ${t.affordabilityAndDisposableIncome} >= 0 and
    ${t.existingFinancialCommitments} >= 0 and
    ${t.bankStatementBehaviour} >= 0 and
    ${t.employmentOrBusinessStability} >= 0 and
    ${t.documentConsistencyAndVerification} >= 0 and
    ${t.verifiedIncomeAndStability} + ${t.affordabilityAndDisposableIncome} +
    ${t.existingFinancialCommitments} + ${t.bankStatementBehaviour} +
    ${t.employmentOrBusinessStability} + ${t.documentConsistencyAndVerification} = 100
  `),
  uniqueIndex('credit_assessment_rules_version_uq').on(t.version),
  uniqueIndex('credit_assessment_rules_single_active_uq').on(t.status).where(sql`${t.status} = 'active'`),
  index('credit_assessment_rules_status_idx').on(t.status, t.version),
])

/** Latest private human-reviewed credit assessment worksheet per application. */
export const creditAssessmentReports = pgTable('credit_assessment_reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => financeApplications.id, { onDelete: 'restrict' }),
  status: text('status').notNull().default('not_started'),
  report: jsonb('report').$type<Record<string, unknown>>().notNull(),
  latestVersion: integer('latest_version').notNull().default(1),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  updatedBy: uuid('updated_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('credit_assessment_reports_application_uq').on(t.applicationId),
  index('credit_assessment_reports_status_idx').on(t.status, t.updatedAt),
])

/** Immutable point-in-time snapshots of every saved assessment report. */
export const creditAssessmentReportVersions = pgTable('credit_assessment_report_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id').notNull().references(() => creditAssessmentReports.id, { onDelete: 'restrict' }),
  applicationId: uuid('application_id').notNull().references(() => financeApplications.id, { onDelete: 'restrict' }),
  version: integer('version').notNull(),
  status: text('status').notNull(),
  report: jsonb('report').$type<Record<string, unknown>>().notNull(),
  savedBy: uuid('saved_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('credit_assessment_report_versions_version_uq').on(t.reportId, t.version),
  index('credit_assessment_report_versions_application_idx').on(t.applicationId, t.createdAt),
])

/** Immutable, encrypted transaction evidence transcribed from verified bank statements. */
export const creditAssessmentTransactionEvidence = pgTable('credit_assessment_transaction_evidence', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => financeApplications.id, { onDelete: 'restrict' }),
  sourceDocumentId: uuid('source_document_id').notNull().references(() => applicationDocuments.id, { onDelete: 'restrict' }),
  statementPeriodStart: date('statement_period_start', { mode: 'date' }),
  statementPeriodEnd: date('statement_period_end', { mode: 'date' }),
  initialClassification: text('initial_classification').notNull().default('needs_review'),
  transactionDetailsCiphertext: text('transaction_details_ciphertext').notNull(),
  evidenceFingerprint: text('evidence_fingerprint').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('credit_assessment_transaction_evidence_initial_classification_check', sql`${t.initialClassification} = 'needs_review'`),
  check('credit_assessment_transaction_evidence_statement_period_check', sql`(${t.statementPeriodStart} is null and ${t.statementPeriodEnd} is null) or (${t.statementPeriodStart} is not null and ${t.statementPeriodEnd} is not null and ${t.statementPeriodStart} <= ${t.statementPeriodEnd})`),
  uniqueIndex('credit_assessment_transaction_evidence_dedup_uq').on(t.applicationId, t.sourceDocumentId, t.evidenceFingerprint),
  index('credit_assessment_transaction_evidence_application_idx').on(t.applicationId, t.createdAt),
  index('credit_assessment_transaction_evidence_source_document_idx').on(t.sourceDocumentId),
])

/** Append-only human classification history; the latest version is authoritative. */
export const creditAssessmentTransactionEvidenceReviews = pgTable('credit_assessment_transaction_evidence_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  evidenceId: uuid('evidence_id').notNull().references(() => creditAssessmentTransactionEvidence.id, { onDelete: 'restrict' }),
  version: integer('version').notNull(),
  classification: text('classification').notNull(),
  reviewerNote: text('reviewer_note').notNull().default(''),
  reviewedBy: uuid('reviewed_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('credit_assessment_transaction_evidence_reviews_version_check', sql`${t.version} > 0`),
  check('credit_assessment_transaction_evidence_reviews_classification_check', sql`${t.classification} in ('needs_review', 'debit_order_reversal', 'not_a_debit_order_reversal')`),
  uniqueIndex('credit_assessment_transaction_evidence_reviews_version_uq').on(t.evidenceId, t.version),
  index('credit_assessment_transaction_evidence_reviews_latest_idx').on(t.evidenceId, t.version),
])

export const assignments = pgTable('assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => financeApplications.id, { onDelete: 'cascade' }),
  assignedTo: uuid('assigned_to').notNull().references(() => users.id, { onDelete: 'restrict' }),
  assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (t) => [index('assignments_assignee_idx').on(t.assignedTo), index('assignments_application_idx').on(t.applicationId)])

export const consentRecords = pgTable('consent_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => financeApplications.id, { onDelete: 'cascade' }),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  consentType: consentTypeEnum('consent_type').notNull(),
  accepted: boolean('accepted').notNull(),
  wordingVersion: text('wording_version').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('consent_records_application_idx').on(t.applicationId)])

export const referrals = pgTable('referrals', {
  id: uuid('id').defaultRandom().primaryKey(),
  partnerUserId: uuid('partner_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  code: text('code').notNull(),
  applicationId: uuid('application_id').references(() => financeApplications.id, { onDelete: 'set null' }),
  referredAt: timestamp('referred_at', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
}, (t) => [index('referrals_code_idx').on(t.code), index('referrals_partner_idx').on(t.partnerUserId)])

export const partnerRegistrations = pgTable('partner_registrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  businessName: text('business_name').notNull(),
  contactName: text('contact_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  status: partnerStatusEnum('status').default('Pending approval').notNull(),
  referralCode: text('referral_code'),
  canUploadSupportingDocuments: boolean('can_upload_supporting_documents').default(false).notNull(),
  details: jsonb('details').$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps(),
}, (t) => [uniqueIndex('partner_registrations_referral_code_uq').on(t.referralCode), index('partner_registrations_status_idx').on(t.status)])

/** Immutable, versioned fee terms configured and activated separately for each merchant partner. */
export const partnerCommercialTerms = pgTable('partner_commercial_terms', {
  id: uuid('id').defaultRandom().primaryKey(),
  partnerRegistrationId: uuid('partner_registration_id').notNull().references(() => partnerRegistrations.id, { onDelete: 'restrict' }),
  version: integer('version').notNull(),
  status: text('status').notNull().default('draft'),
  facilitationRateBps: integer('facilitation_rate_bps').notNull(),
  adminFeeMode: text('admin_fee_mode').notNull(),
  adminRateBps: integer('admin_rate_bps').notNull(),
  adminFixedAmountCents: bigint('admin_fixed_amount_cents', { mode: 'number' }),
  rationale: text('rationale').notNull(),
  createdBy: uuid('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'restrict' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  check('partner_commercial_terms_version_check', sql`${t.version} > 0`),
  check('partner_commercial_terms_status_check', sql`${t.status} in ('draft', 'active', 'superseded')`),
  check('partner_commercial_terms_rationale_check', sql`length(btrim(${t.rationale})) >= 10`),
  check('partner_commercial_terms_facilitation_rate_check', sql`${t.facilitationRateBps} between 0 and 10000`),
  check('partner_commercial_terms_admin_rate_check', sql`${t.adminRateBps} between 0 and 10000`),
  check('partner_commercial_terms_admin_mode_check', sql`${t.adminFeeMode} in ('percentage', 'fixed')`),
  check('partner_commercial_terms_admin_value_check', sql`
    (${t.adminFeeMode} = 'percentage' and ${t.adminFixedAmountCents} is null and ${t.facilitationRateBps} + ${t.adminRateBps} <= 10000)
    or (${t.adminFeeMode} = 'fixed' and ${t.adminRateBps} = 0 and ${t.adminFixedAmountCents} is not null and ${t.adminFixedAmountCents} >= 0)
  `),
  check('partner_commercial_terms_approval_check', sql`
    (${t.status} = 'active' and ${t.approvedBy} is not null and ${t.approvedAt} is not null)
    or (${t.status} = 'draft' and ${t.approvedBy} is null and ${t.approvedAt} is null)
    or ${t.status} = 'superseded'
  `),
  uniqueIndex('partner_commercial_terms_partner_version_uq').on(t.partnerRegistrationId, t.version),
  uniqueIndex('partner_commercial_terms_single_active_uq').on(t.partnerRegistrationId).where(sql`${t.status} = 'active'`),
  index('partner_commercial_terms_partner_status_idx').on(t.partnerRegistrationId, t.status, t.version),
])

export const customerPreferences = pgTable('customer_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  preferences: jsonb('preferences').$type<Record<string, unknown>>().default({}).notNull(),
  ...timestamps(),
}, (t) => [uniqueIndex('customer_preferences_customer_uq').on(t.customerId)])

export const officeNotes = pgTable('office_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => financeApplications.id, { onDelete: 'cascade' }),
  authorUserId: uuid('author_user_id').references(() => users.id, { onDelete: 'set null' }),
  body: text('body').notNull(),
  isInternal: boolean('is_internal').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('office_notes_application_idx').on(t.applicationId)])

export const officeApplicationSummaries = pgTable('office_application_summaries', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => financeApplications.id, { onDelete: 'cascade' }),
  summary: text('summary').notNull(),
  generatedBy: text('generated_by').notNull().default('human'),
  generatedAt: timestamp('generated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex('office_application_summaries_application_uq').on(t.applicationId)])

export const supportRequests = pgTable('support_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  channel: supportChannelEnum('channel').notNull(),
  status: supportStatusEnum('status').default('Open').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps(),
}, (t) => [index('support_requests_status_idx').on(t.status)])

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  channel: text('channel').notNull(),
  template: text('template').notNull(),
  status: text('status').default('queued').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().default({}).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  lastError: text('last_error'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  ...timestamps(),
}, (t) => [index('notifications_user_status_idx').on(t.userId, t.status)])

export const integrationOperations = pgTable('integration_operations', {
  id: uuid('id').defaultRandom().primaryKey(),
  provider: text('provider').notNull(),
  operation: text('operation').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  status: text('status').default('pending').notNull(),
  requestMetadata: jsonb('request_metadata').$type<Record<string, unknown>>().default({}).notNull(),
  resultMetadata: jsonb('result_metadata').$type<Record<string, unknown>>().default({}).notNull(),
  attempts: integer('attempts').default(0).notNull(),
  lastError: text('last_error'),
  ...timestamps(),
}, (t) => [uniqueIndex('integration_operations_idempotency_key_uq').on(t.idempotencyKey), index('integration_operations_status_idx').on(t.status)])

/** Append-only reversals and corrections; values are signed deltas against the original settlement. */
export const settlementAdjustments = pgTable('settlement_adjustments', {
  id: uuid('id').defaultRandom().primaryKey(),
  settlementId: uuid('settlement_id').notNull().references(() => settlementRecords.id, { onDelete: 'restrict' }),
  applicationId: uuid('application_id').notNull().references(() => financeApplications.id, { onDelete: 'restrict' }),
  partnerUserId: uuid('partner_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  adjustmentReference: text('adjustment_reference').notNull(),
  adjustmentType: text('adjustment_type').notNull(),
  reason: text('reason').notNull(),
  actualFunderSettlementDeltaCents: bigint('actual_funder_settlement_delta_cents', { mode: 'number' }).notNull(),
  documentationFeeDeltaCents: bigint('documentation_fee_delta_cents', { mode: 'number' }).notNull(),
  partnerGrossDeltaCents: bigint('partner_gross_delta_cents', { mode: 'number' }).notNull(),
  facilitationFeeDeltaCents: bigint('facilitation_fee_delta_cents', { mode: 'number' }).notNull(),
  adminFeeDeltaCents: bigint('admin_fee_delta_cents', { mode: 'number' }).notNull(),
  partnerNetDeltaCents: bigint('partner_net_delta_cents', { mode: 'number' }).notNull(),
  oxfordTotalFeesDeltaCents: bigint('oxford_total_fees_delta_cents', { mode: 'number' }).notNull(),
  recordedBy: uuid('recorded_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('settlement_adjustments_reference_uq').on(t.adjustmentReference),
  uniqueIndex('settlement_adjustments_one_reversal_uq').on(t.settlementId).where(sql`${t.adjustmentType} = 'reversal'`),
  uniqueIndex('settlement_adjustments_one_correction_uq').on(t.settlementId).where(sql`${t.adjustmentType} = 'correction'`),
  index('settlement_adjustments_partner_idx').on(t.partnerUserId, t.createdAt),
  check('settlement_adjustments_type_check', sql`${t.adjustmentType} in ('reversal', 'correction')`),
  check('settlement_adjustments_reconciliation_check', sql`${t.partnerGrossDeltaCents} = ${t.actualFunderSettlementDeltaCents} - ${t.documentationFeeDeltaCents} and ${t.partnerNetDeltaCents} = ${t.partnerGrossDeltaCents} - ${t.facilitationFeeDeltaCents} - ${t.adminFeeDeltaCents} and ${t.oxfordTotalFeesDeltaCents} = ${t.facilitationFeeDeltaCents} + ${t.adminFeeDeltaCents}`),
])

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  event: text('event').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  details: jsonb('details').$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index('audit_events_created_idx').on(t.createdAt)])

export const siteContent = pgTable('site_content', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: text('key').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  status: text('status').default('draft').notNull(),
  updatedBy: uuid('updated_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps(),
}, (t) => [uniqueIndex('site_content_key_uq').on(t.key)])

/** Compatibility alias for code/documentation using the historic entity name. */
export const financeApplication = financeApplications


export const enquiryAssessments = pgTable('enquiry_assessments', {
  id: uuid('id').defaultRandom().primaryKey(),
  supportRequestId: uuid('support_request_id').references(() => supportRequests.id, { onDelete: 'cascade' }),
  score: integer('score'),
  priority: priorityEnum('priority').default('Medium').notNull(),
  rationale: text('rationale'),
  assessedAt: timestamp('assessed_at', { withTimezone: true }).defaultNow().notNull(),
})

/**
 * Confirmed funder settlements are append-only. The funder settlement amount
 * is stored gross, before the 1% documentation deduction. Each row snapshots
 * the approved amount, fee outputs and partner-specific terms version used.
 * Partner-facing queries must project partnerNetPayableCents only.
 */
export const settlementRecords = pgTable('settlement_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => financeApplications.id, { onDelete: 'restrict' }),
  partnerRegistrationId: uuid('partner_registration_id').notNull().references(() => partnerRegistrations.id, { onDelete: 'restrict' }),
  partnerCommercialTermsId: uuid('partner_commercial_terms_id').references(() => partnerCommercialTerms.id, { onDelete: 'restrict' }),
  partnerUserId: uuid('partner_user_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  applicationReferenceSnapshot: text('application_reference_snapshot').notNull(),
  partnerBusinessNameSnapshot: text('partner_business_name_snapshot').notNull(),
  settlementReference: text('settlement_reference').notNull(),
  currency: text('currency').notNull().default('ZAR'),
  approvedFinanceAmountCents: bigint('approved_finance_amount_cents', { mode: 'number' }).notNull(),
  actualFunderSettlementAmountCents: bigint('actual_funder_settlement_amount_cents', { mode: 'number' }).notNull(),
  documentationFeeRateBps: integer('documentation_fee_rate_bps').notNull().default(100),
  documentationFeeCents: bigint('documentation_fee_cents', { mode: 'number' }).notNull(),
  partnerGrossPayableCents: bigint('partner_gross_payable_cents', { mode: 'number' }).notNull(),
  facilitationRateBps: integer('facilitation_rate_bps'),
  facilitationFeeCents: bigint('facilitation_fee_cents', { mode: 'number' }).notNull(),
  adminFeeMode: text('admin_fee_mode'),
  adminFixedAmountCents: bigint('admin_fixed_amount_cents', { mode: 'number' }),
  adminFeeCents: bigint('admin_fee_cents', { mode: 'number' }).notNull(),
  partnerNetPayableCents: bigint('partner_net_payable_cents', { mode: 'number' }).notNull(),
  oxfordTotalFeesCents: bigint('oxford_total_fees_cents', { mode: 'number' }).notNull(),
  adminRateBps: integer('admin_rate_bps').notNull(),
  termsVersion: text('terms_version').notNull(),
  settledAt: timestamp('settled_at', { withTimezone: true }).notNull(),
  recordedBy: uuid('recorded_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('settlement_records_reference_uq').on(t.settlementReference),
  uniqueIndex('settlement_records_application_uq').on(t.applicationId),
  index('settlement_records_partner_idx').on(t.partnerUserId, t.settledAt),
  index('settlement_records_partner_terms_idx').on(t.partnerCommercialTermsId),
  check('settlement_records_documentation_rate_check', sql`${t.documentationFeeRateBps} = 100`),
  check('settlement_records_terms_snapshot_check', sql`
    (${t.partnerCommercialTermsId} is null and ${t.facilitationRateBps} is null and ${t.adminFeeMode} is null and ${t.adminFixedAmountCents} is null)
    or
    (${t.partnerCommercialTermsId} is not null and ${t.facilitationRateBps} between 0 and 10000 and (
      (${t.adminFeeMode} = 'percentage' and ${t.adminFixedAmountCents} is null and ${t.facilitationRateBps} + ${t.adminRateBps} <= 10000)
      or (${t.adminFeeMode} = 'fixed' and ${t.adminRateBps} = 0 and ${t.adminFixedAmountCents} is not null and ${t.adminFixedAmountCents} >= 0)
    ))
  `),
  check('settlement_records_amounts_nonnegative_check', sql`${t.approvedFinanceAmountCents} > 0 and ${t.actualFunderSettlementAmountCents} > 0 and ${t.documentationFeeCents} >= 0 and ${t.partnerGrossPayableCents} >= 0 and ${t.facilitationFeeCents} >= 0 and ${t.adminFeeCents} >= 0 and ${t.partnerNetPayableCents} >= 0 and ${t.oxfordTotalFeesCents} >= 0`),
  check('settlement_records_reconciliation_check', sql`${t.partnerGrossPayableCents} = ${t.actualFunderSettlementAmountCents} - ${t.documentationFeeCents} and ${t.partnerNetPayableCents} = ${t.partnerGrossPayableCents} - ${t.facilitationFeeCents} - ${t.adminFeeCents} and ${t.oxfordTotalFeesCents} = ${t.facilitationFeeCents} + ${t.adminFeeCents}`),
  check('settlement_records_currency_check', sql`${t.currency} = 'ZAR'`),
])
