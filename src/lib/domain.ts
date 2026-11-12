/**
 * Shared domain types and value lists.
 *
 * This module is deliberately import-free so it can be used by the browser bundle,
 * server functions, the Drizzle schema (`db/schema.ts`) and plain Node scripts alike.
 * `finance-config.ts` re-exports these names so existing imports keep working.
 */

export const applicantTypeIds = ['individual', 'business'] as const
export type ApplicantType = (typeof applicantTypeIds)[number]

export const financeCategoryIds = ['vehicle', 'equipment', 'commercial-asset', 'other'] as const
export type FinanceCategoryId = (typeof financeCategoryIds)[number]

export const applicationStatuses = [
  'Draft',
  'Submitted',
  'Under review',
  'Awaiting documents',
  'With finance provider',
  'Provider decision received',
  'Closed',
] as const
export type ApplicationStatus = (typeof applicationStatuses)[number]

/**
 * Valid operational status changes. Drafts are customer-owned and are never
 * changed through the Office status control. Closed is terminal; reopening
 * requires a separately audited administrative correction process.
 */
const applicationStatusTransitions: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  Draft: [],
  Submitted: ['Under review', 'Awaiting documents', 'Closed'],
  'Under review': ['Awaiting documents', 'With finance provider', 'Closed'],
  'Awaiting documents': ['Under review', 'With finance provider', 'Closed'],
  'With finance provider': ['Awaiting documents', 'Provider decision received', 'Closed'],
  'Provider decision received': ['Closed'],
  Closed: [],
}

export function canTransitionApplicationStatus(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return applicationStatusTransitions[from].includes(to)
}

/**
 * The outcome a *finance provider* communicated. Oxford is an intermediary: a person
 * in the office records the provider's decision. AI and automation never set this.
 */
export const providerDecisions = ['approved', 'declined', 'withdrawn'] as const
export type ProviderDecision = (typeof providerDecisions)[number]

export const priorities = ['High', 'Medium', 'Low'] as const
export type Priority = (typeof priorities)[number]

/**
 * Account types. The type is a hard ceiling on what an account can ever hold:
 * customer and partner accounts can never receive office permissions, whatever
 * roles or overrides are attached to them.
 *
 * - `office`   Oxford staff.
 * - `customer` applicants using the customer dashboard.
 * - `partner`  approved referral partners.
 * - `service`  non-human automation principals (AI scoring, background jobs).
 */
export const accountTypes = ['office', 'customer', 'partner', 'service'] as const
export type AccountType = (typeof accountTypes)[number]

export const accountStatuses = ['invited', 'active', 'disabled'] as const
export type AccountStatus = (typeof accountStatuses)[number]

export const documentStatuses = ['Outstanding', 'Received', 'Verified', 'Rejected'] as const
export type DocumentStatus = (typeof documentStatuses)[number]

export const partnerStatuses = ['Pending approval', 'Approved', 'Suspended', 'Declined'] as const
export type PartnerStatus = (typeof partnerStatuses)[number]

export const supportChannels = ['Contact form', 'Support', 'Complaint', 'Partner enquiry'] as const
export type SupportChannel = (typeof supportChannels)[number]

export const supportStatuses = ['Open', 'Awaiting customer', 'Resolved'] as const
export type SupportStatus = (typeof supportStatuses)[number]

export const consentTypes = ['accuracy', 'processing', 'share_providers', 'credit_check', 'marketing'] as const
export type ConsentType = (typeof consentTypes)[number]

/** The only Microsoft Graph scope this project may use without explicit approval. */
export const ONEDRIVE_GRAPH_SCOPE = 'Files.ReadWrite.AppFolder'
