/**
 * Fictional end-to-end demo actors and activity for Deploy Preview.
 *
 * These records are UI fixtures only. They are not authentication accounts and
 * must never be inserted into production tables or used to grant permissions.
 * All addresses use example.com and all telephone numbers are reserved demo values.
 */

export type DemoRole =
  | 'Super Administrator'
  | 'Administrator'
  | 'Office staff'
  | 'Application reviewer'
  | 'Customer support'
  | 'Customer'
  | 'Partner'

export interface DemoActor {
  id: string
  name: string
  role: DemoRole
  email: string
  organisation?: string
  description: string
  actions: string[]
}

export interface DemoTimelineEvent {
  id: string
  actorId: string
  occurredAt: string
  action: string
  record: string
  outcome: string
}

export interface DemoApplication {
  reference: string
  applicantActorId: string
  createdByActorId: string
  reviewerActorId?: string
  partnerActorId?: string
  applicantType: 'individual' | 'business'
  category: 'vehicle' | 'equipment' | 'commercial-asset'
  asset: string
  amountZar: number
  status: 'Draft' | 'Submitted' | 'Under review' | 'Awaiting documents' | 'With finance provider' | 'Provider decision received'
  priority: 'High' | 'Medium' | 'Low'
  outstandingDocuments: string[]
  assessment: {
    score: number
    outcome: 'Proceed to human review' | 'Manual review required' | 'More information required'
    bureauUsed: false
    reversalCountLastThreeMonths: number
    reversalEvidence: 'verified' | 'unverified' | 'none'
    rationale: string[]
  }
  partnerVisibility: 'referral-only'
}

export const demoActors: DemoActor[] = [
  {
    id: 'demo-super-admin',
    name: 'Nandi Mokoena',
    role: 'Super Administrator',
    email: 'nandi.superadmin@example.com',
    description: 'Controls roles, permissions, partner upload settings, catalogue and system oversight.',
    actions: ['Reviews access audit', 'Enables supporting uploads for one approved partner', 'Checks all application and fee reports', 'Leaves production processing disabled'],
  },
  {
    id: 'demo-admin',
    name: 'Thabo Dlamini',
    role: 'Administrator',
    email: 'thabo.admin@example.com',
    description: 'Runs daily office operations within the permissions assigned by Super Administrator.',
    actions: ['Checks new application queue', 'Assigns an application to a reviewer', 'Updates an approved partner profile', 'Reviews operational reports'],
  },
  {
    id: 'demo-office',
    name: 'Lerato Nkosi',
    role: 'Office staff',
    email: 'lerato.office@example.com',
    description: 'Handles a walk-in business applicant and records the intake without creating a password for them.',
    actions: ['Creates an Office intake', 'Links an approved merchant partner', 'Uploads a supplier quotation', 'Sends a secure applicant invitation'],
  },
  {
    id: 'demo-reviewer',
    name: 'Ayesha Patel',
    role: 'Application reviewer',
    email: 'ayesha.reviewer@example.com',
    description: 'Checks completeness and records an evidence-based internal assessment for human review.',
    actions: ['Opens assigned application', 'Checks supporting documents', 'Reviews bank-statement reversal evidence', 'Requests missing documents and records rationale'],
  },
  {
    id: 'demo-support',
    name: 'Sipho Khumalo',
    role: 'Customer support',
    email: 'sipho.support@example.com',
    description: 'Responds to applicant queries without accessing restricted financial documents.',
    actions: ['Acknowledges a support request', 'Records a call outcome', 'Requests an update from the assigned office member', 'Closes a resolved support ticket'],
  },
  {
    id: 'demo-customer',
    name: 'Zanele Ndlovu',
    role: 'Customer',
    email: 'zanele.applicant@example.com',
    description: 'Receives an invitation, creates her own password, verifies her email and completes her application.',
    actions: ['Opens secure invitation', 'Creates own account and verifies email', 'Completes finance and consent details', 'Uploads identity, address and income documents', 'Tracks application status'],
  },
  {
    id: 'demo-partner',
    name: 'Musa Dube',
    role: 'Partner',
    email: 'musa.partner@example.com',
    organisation: 'Demo Commercial Vehicles (Pty) Ltd',
    description: 'Refers a customer and can see only referrals linked to this partner account.',
    actions: ['Registers a referral', 'Checks own referral status', 'Uploads supplier quotation', 'Uploads additional supplier documents only when Super Administrator enables it', 'Views own expected payout without Oxford fee breakdown'],
  },
]

export const demoApplications: DemoApplication[] = [
  {
    reference: 'OBG-DEMO-2026-001',
    applicantActorId: 'demo-customer',
    createdByActorId: 'demo-office',
    reviewerActorId: 'demo-reviewer',
    partnerActorId: 'demo-partner',
    applicantType: 'business',
    category: 'vehicle',
    asset: 'Two refrigerated delivery vehicles',
    amountZar: 1850000,
    status: 'Under review',
    priority: 'High',
    outstandingDocuments: ['Latest business bank statements'],
    assessment: {
      score: 78,
      outcome: 'Manual review required',
      bureauUsed: false,
      reversalCountLastThreeMonths: 3,
      reversalEvidence: 'verified',
      rationale: ['Three verified debit-order reversals in the latest three calendar months exceed Oxford\'s two-reversal review threshold.', 'This is a manual-review trigger, not an automatic decline.', 'A human reviewer must consider the full application and record the reason for the next step.'],
    },
    partnerVisibility: 'referral-only',
  },
  {
    reference: 'OBG-DEMO-2026-002',
    applicantActorId: 'demo-customer',
    createdByActorId: 'demo-office',
    reviewerActorId: 'demo-reviewer',
    applicantType: 'individual',
    category: 'equipment',
    asset: 'Home solar and backup power system',
    amountZar: 265000,
    status: 'Awaiting documents',
    priority: 'Medium',
    outstandingDocuments: ['Proof of address', 'Latest payslip'],
    assessment: {
      score: 64,
      outcome: 'More information required',
      bureauUsed: false,
      reversalCountLastThreeMonths: 1,
      reversalEvidence: 'unverified',
      rationale: ['One possible reversal is unverified and must not be counted as a confirmed reversal.', 'Proof of address and income evidence remain outstanding.'],
    },
    partnerVisibility: 'referral-only',
  },
  {
    reference: 'OBG-DEMO-2026-003',
    applicantActorId: 'demo-customer',
    createdByActorId: 'demo-admin',
    reviewerActorId: 'demo-reviewer',
    applicantType: 'business',
    category: 'equipment',
    asset: '20-ton construction excavator',
    amountZar: 1120000,
    status: 'With finance provider',
    priority: 'High',
    outstandingDocuments: [],
    assessment: {
      score: 88,
      outcome: 'Proceed to human review',
      bureauUsed: false,
      reversalCountLastThreeMonths: 0,
      reversalEvidence: 'none',
      rationale: ['Required demo documents are marked complete.', 'Internal assessment supports submission for provider consideration.', 'No credit bureau data was requested or used.'],
    },
    partnerVisibility: 'referral-only',
  },
]

export function getDemoVisibleApplications(role: DemoRole, actorId: string): DemoApplication[] {
  if (role === 'Customer') return demoApplications.filter((item) => item.applicantActorId === actorId)
  if (role === 'Partner') return demoApplications.filter((item) => item.partnerActorId === actorId)
  if (role === 'Customer support') return []
  if (role === 'Office staff') return demoApplications.filter((item) => item.createdByActorId === actorId)
  if (role === 'Application reviewer') return demoApplications.filter((item) => item.reviewerActorId === actorId)
  return demoApplications
}

export function getDemoVisibleEvents(role: DemoRole, actorId: string, events: DemoTimelineEvent[]): DemoTimelineEvent[] {
  if (role === 'Super Administrator' || role === 'Administrator') return events
  const visibleReferences = new Set(getDemoVisibleApplications(role, actorId).map((item) => item.reference))
  return events.filter((event) => event.actorId === actorId || visibleReferences.has(event.record) ||
    (role === 'Customer support' && event.record.startsWith('SUP-DEMO-')))
}

export const demoTimeline: DemoTimelineEvent[] = [
  { id: 'demo-event-01', actorId: 'demo-office', occurredAt: '2026-11-10T08:10:00+02:00', action: 'Created walk-in intake and issued applicant invitation', record: 'OBG-DEMO-2026-001', outcome: 'Invitation queued in preview-only mode' },
  { id: 'demo-event-02', actorId: 'demo-customer', occurredAt: '2026-11-10T08:34:00+02:00', action: 'Created own account and verified email', record: 'OBG-DEMO-2026-001', outcome: 'Applicant identity verified in demo scenario' },
  { id: 'demo-event-03', actorId: 'demo-partner', occurredAt: '2026-11-10T08:42:00+02:00', action: 'Uploaded supplier quotation', record: 'OBG-DEMO-2026-001', outcome: 'Quotation received; no applicant-private documents exposed' },
  { id: 'demo-event-04', actorId: 'demo-reviewer', occurredAt: '2026-11-10T09:05:00+02:00', action: 'Completed preliminary assessment', record: 'OBG-DEMO-2026-001', outcome: 'Manual review required because three verified reversals were identified' },
  { id: 'demo-event-05', actorId: 'demo-support', occurredAt: '2026-11-10T09:18:00+02:00', action: 'Responded to applicant document query', record: 'SUP-DEMO-004', outcome: 'Applicant advised which documents remain outstanding' },
  { id: 'demo-event-06', actorId: 'demo-admin', occurredAt: '2026-11-10T09:30:00+02:00', action: 'Assigned application to reviewer', record: 'OBG-DEMO-2026-001', outcome: 'Assignment recorded in the demo activity trail' },
  { id: 'demo-event-07', actorId: 'demo-super-admin', occurredAt: '2026-11-10T09:45:00+02:00', action: 'Reviewed partner document-upload permission', record: 'PARTNER-DEMO-01', outcome: 'Additional supplier uploads enabled for this demo partner only' },
]

export const demoSupportRequests = [
  { reference: 'SUP-DEMO-004', subject: 'Which bank statements are required?', customerActorId: 'demo-customer', assignedActorId: 'demo-support', status: 'Awaiting customer', channel: 'Support' as const },
  { reference: 'SUP-DEMO-005', subject: 'Please confirm quotation validity period', customerActorId: 'demo-customer', assignedActorId: 'demo-support', status: 'Open' as const, channel: 'Contact form' as const },
]

export const demoPartnerSummary = {
  partnerActorId: 'demo-partner',
  referrals: 4,
  applicationsSubmitted: 3,
  expectedPayoutZar: 905850,
  feeBreakdownVisibleToPartner: false,
  canSeeApplicantPrivateDocuments: false,
  additionalSupplierUploadsEnabled: true,
}

export const demoEnvironment = {
  label: 'DEMO DATA — FICTIONAL',
  outboundEmailEnabled: false,
  outboundWhatsAppEnabled: false,
  financeProviderSubmissionEnabled: false,
  productionWritesEnabled: false,
} as const
