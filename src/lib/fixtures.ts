/**
 * PREVIEW DATA — every record in this file is fictional and exists only to make the
 * product surface clickable before the database milestone lands (see PLAN.md, M2–M4).
 * Replace imports of this module with server functions backed by Netlify Database.
 * Never ship these records to a production environment.
 */
import type { ApplicantType, ApplicationStatus, FinanceCategoryId } from './finance-config'

export type Priority = 'High' | 'Medium' | 'Low'
export type OfficeRole = 'Administrator' | 'Office staff' | 'Application reviewer' | 'Customer support'

export interface StaffMember {
  id: string
  name: string
  role: OfficeRole
  initials: string
}

export interface OfficeNote {
  id: string
  author: string
  at: string
  body: string
}

export interface ActivityEvent {
  id: string
  at: string
  actor: string
  action: string
  kind: 'system' | 'staff' | 'customer' | 'automation'
}

export interface DocumentRecord {
  id: string
  label: string
  status: 'Outstanding' | 'Received' | 'Verified'
}

export interface FinanceApplication {
  reference: string
  applicantType: ApplicantType
  category: FinanceCategoryId
  applicantName: string
  contactEmail: string
  contactPhone: string
  amount: number
  term: number
  status: ApplicationStatus
  priority: Priority
  score: number
  assignedTo?: string
  referralCode?: string
  submittedAt: string
  updatedAt: string
  assetDescription: string
  summary: string
  scoreSignals: string[]
  documents: DocumentRecord[]
  notes: OfficeNote[]
  activity: ActivityEvent[]
}

export const staff: StaffMember[] = [
  { id: 's1', name: 'Preview Administrator', role: 'Administrator', initials: 'PA' },
  { id: 's2', name: 'Preview Reviewer', role: 'Application reviewer', initials: 'PR' },
  { id: 's3', name: 'Preview Office Staff', role: 'Office staff', initials: 'PO' },
  { id: 's4', name: 'Preview Support', role: 'Customer support', initials: 'PS' },
]

const docs = (labels: [string, DocumentRecord['status']][]): DocumentRecord[] =>
  labels.map(([label, status], i) => ({ id: `d${i}`, label, status }))

export const applications: FinanceApplication[] = [
  {
    reference: 'OBG-APP-PREVIEW-1001',
    applicantType: 'business',
    category: 'commercial-asset',
    applicantName: 'Sample Logistics (Pty) Ltd',
    contactEmail: 'sample.logistics@example.com',
    contactPhone: '+27 00 000 0001',
    amount: 2_450_000,
    term: 60,
    status: 'Under review',
    priority: 'High',
    score: 86,
    assignedTo: 'Preview Reviewer',
    referralCode: 'PARTNER-DEMO-01',
    submittedAt: '2026-11-05T08:42:00Z',
    updatedAt: '2026-11-06T14:10:00Z',
    assetDescription: 'Two 8-ton rigid trucks with refrigerated bodies',
    summary:
      'Established logistics operator seeking finance for two refrigerated rigid trucks to service a renewed retail distribution contract. Financial statements and supplier quotation supplied; bank statements outstanding.',
    scoreSignals: ['Complete business profile', 'Supplier quotation provided', 'Partner referral', 'Bank statements outstanding'],
    documents: docs([['CIPC registration', 'Verified'], ['Directors’ IDs', 'Received'], ['Annual financial statements', 'Received'], ['Business bank statements', 'Outstanding'], ['Supplier quotation', 'Received']]),
    notes: [
      { id: 'n1', author: 'Preview Reviewer', at: '2026-11-06T14:10:00Z', body: 'Called the financial director — bank statements to follow by Friday.' },
    ],
    activity: [
      { id: 'a1', at: '2026-11-05T08:42:00Z', actor: 'Customer', action: 'Application submitted', kind: 'customer' },
      { id: 'a2', at: '2026-11-05T08:43:00Z', actor: 'Automation', action: 'Enquiry scored 86 — High priority', kind: 'automation' },
      { id: 'a3', at: '2026-11-05T09:15:00Z', actor: 'Preview Administrator', action: 'Assigned to Preview Reviewer', kind: 'staff' },
      { id: 'a4', at: '2026-11-06T14:10:00Z', actor: 'Preview Reviewer', action: 'Status changed to Under review', kind: 'staff' },
    ],
  },
  {
    reference: 'OBG-APP-PREVIEW-1002',
    applicantType: 'individual',
    category: 'vehicle',
    applicantName: 'Sample Applicant A',
    contactEmail: 'applicant.a@example.com',
    contactPhone: '+27 00 000 0002',
    amount: 685_000,
    term: 72,
    status: 'Awaiting documents',
    priority: 'Medium',
    score: 64,
    assignedTo: 'Preview Office Staff',
    submittedAt: '2026-11-04T16:05:00Z',
    updatedAt: '2026-11-05T10:30:00Z',
    assetDescription: 'Pre-owned 2024 mid-size SUV',
    summary:
      'Salaried applicant seeking vehicle finance for a pre-owned SUV through a dealership. Income documents received; proof of address outstanding.',
    scoreSignals: ['Salaried income', 'Vehicle selected', 'Proof of address outstanding'],
    documents: docs([['ID document', 'Received'], ['Payslips', 'Received'], ['Bank statements', 'Received'], ['Proof of address', 'Outstanding']]),
    notes: [],
    activity: [
      { id: 'a1', at: '2026-11-04T16:05:00Z', actor: 'Customer', action: 'Application submitted', kind: 'customer' },
      { id: 'a2', at: '2026-11-04T16:06:00Z', actor: 'Automation', action: 'Enquiry scored 64 — Medium priority', kind: 'automation' },
      { id: 'a3', at: '2026-11-05T10:30:00Z', actor: 'Preview Office Staff', action: 'Requested proof of address', kind: 'staff' },
    ],
  },
  {
    reference: 'OBG-APP-PREVIEW-1003',
    applicantType: 'business',
    category: 'equipment',
    applicantName: 'Sample Earthworks CC',
    contactEmail: 'earthworks@example.com',
    contactPhone: '+27 00 000 0003',
    amount: 1_120_000,
    term: 48,
    status: 'Submitted',
    priority: 'High',
    score: 79,
    submittedAt: '2026-11-06T11:20:00Z',
    updatedAt: '2026-11-06T11:21:00Z',
    assetDescription: '20-ton excavator, new',
    summary:
      'Civil contractor requesting finance for a new 20-ton excavator to support a secured municipal contract. Awaiting office assignment.',
    scoreSignals: ['Supplier quotation provided', 'Secured contract referenced', 'Not yet assigned'],
    documents: docs([['CIPC registration', 'Received'], ['Members’ IDs', 'Received'], ['Financial statements', 'Outstanding'], ['Supplier quotation', 'Received']]),
    notes: [],
    activity: [
      { id: 'a1', at: '2026-11-06T11:20:00Z', actor: 'Customer', action: 'Application submitted', kind: 'customer' },
      { id: 'a2', at: '2026-11-06T11:21:00Z', actor: 'Automation', action: 'Enquiry scored 79 — High priority', kind: 'automation' },
    ],
  },
  {
    reference: 'OBG-APP-PREVIEW-1004',
    applicantType: 'individual',
    category: 'other',
    applicantName: 'Sample Applicant B',
    contactEmail: 'applicant.b@example.com',
    contactPhone: '+27 00 000 0004',
    amount: 240_000,
    term: 36,
    status: 'With finance provider',
    priority: 'Low',
    score: 48,
    assignedTo: 'Preview Reviewer',
    submittedAt: '2026-10-29T09:00:00Z',
    updatedAt: '2026-11-03T15:45:00Z',
    assetDescription: 'Solar and backup power installation for a home office',
    summary: 'Self-employed applicant seeking finance for a solar installation. Pack submitted to a provider for assessment.',
    scoreSignals: ['Self-employed income', 'Specialised requirement'],
    documents: docs([['ID document', 'Verified'], ['Proof of income', 'Verified'], ['Bank statements', 'Verified'], ['Proof of address', 'Verified']]),
    notes: [{ id: 'n1', author: 'Preview Reviewer', at: '2026-11-03T15:45:00Z', body: 'Pack sent to provider. Expect feedback within 5 working days.' }],
    activity: [
      { id: 'a1', at: '2026-10-29T09:00:00Z', actor: 'Customer', action: 'Application submitted', kind: 'customer' },
      { id: 'a2', at: '2026-11-03T15:45:00Z', actor: 'Preview Reviewer', action: 'Status changed to With finance provider', kind: 'staff' },
    ],
  },
  {
    reference: 'OBG-APP-PREVIEW-1005',
    applicantType: 'business',
    category: 'vehicle',
    applicantName: 'Sample Consulting Trust',
    contactEmail: 'consulting@example.com',
    contactPhone: '+27 00 000 0005',
    amount: 920_000,
    term: 60,
    status: 'Provider decision received',
    priority: 'Medium',
    score: 71,
    assignedTo: 'Preview Office Staff',
    submittedAt: '2026-10-21T13:30:00Z',
    updatedAt: '2026-11-02T08:00:00Z',
    assetDescription: 'Three passenger vehicles for a field team',
    summary: 'Provider decision received and recorded. Customer to be contacted by the assigned consultant.',
    scoreSignals: ['Complete business profile', 'Fleet requirement'],
    documents: docs([['Trust deed', 'Verified'], ['Trustees’ IDs', 'Verified'], ['Financial statements', 'Verified'], ['Bank statements', 'Verified'], ['Resolution', 'Verified']]),
    notes: [],
    activity: [
      { id: 'a1', at: '2026-10-21T13:30:00Z', actor: 'Customer', action: 'Application submitted', kind: 'customer' },
      { id: 'a2', at: '2026-11-02T08:00:00Z', actor: 'Preview Office Staff', action: 'Provider decision recorded', kind: 'staff' },
    ],
  },
]

export interface CustomerDraft {
  id: string
  applicantType: ApplicantType
  category: FinanceCategoryId
  stepLabel: string
  progress: number
  updatedAt: string
}

export const previewCustomer = {
  name: 'Sample Applicant A',
  email: 'applicant.a@example.com',
  phone: '+27 00 000 0002',
  preferences: { statusEmails: true, marketing: false, preferredContact: 'Email' as 'Email' | 'Phone' },
  applicationRefs: ['OBG-APP-PREVIEW-1002'],
  drafts: [
    { id: 'draft-1', applicantType: 'individual', category: 'equipment', stepLabel: 'Finance requirement', progress: 40, updatedAt: '2026-11-06T19:12:00Z' },
  ] as CustomerDraft[],
  messages: [
    { id: 'm1', at: '2026-11-05T10:30:00Z', from: 'Oxford office', body: 'Thank you for your application. Please provide a proof of address not older than three months once secure document collection opens.' },
  ],
}

export interface PartnerRecord {
  id: string
  organisation: string
  contact: string
  type: string
  status: 'Pending approval' | 'Approved' | 'Suspended'
  referralCode?: string
  referrals: number
  submitted: number
  joinedAt: string
}

export const partners: PartnerRecord[] = [
  { id: 'p1', organisation: 'Sample Motor Dealership', contact: 'Preview Contact 1', type: 'Dealership', status: 'Approved', referralCode: 'PARTNER-DEMO-01', referrals: 14, submitted: 9, joinedAt: '2026-08-14' },
  { id: 'p2', organisation: 'Sample Equipment Supplier', contact: 'Preview Contact 2', type: 'Supplier', status: 'Approved', referralCode: 'PARTNER-DEMO-02', referrals: 6, submitted: 4, joinedAt: '2026-09-02' },
  { id: 'p3', organisation: 'Sample Accounting Practice', contact: 'Preview Contact 3', type: 'Professional adviser', status: 'Pending approval', referrals: 0, submitted: 0, joinedAt: '2026-11-05' },
]

export interface SupportRequest {
  id: string
  subject: string
  from: string
  channel: 'Contact form' | 'Support' | 'Complaint'
  status: 'Open' | 'Awaiting customer' | 'Resolved'
  receivedAt: string
}

export const supportRequests: SupportRequest[] = [
  { id: 'r1', subject: 'Question about required business documents', from: 'Sample Earthworks CC', channel: 'Support', status: 'Open', receivedAt: '2026-11-06T12:02:00Z' },
  { id: 'r2', subject: 'How long does provider assessment take?', from: 'Sample Applicant A', channel: 'Contact form', status: 'Awaiting customer', receivedAt: '2026-11-05T17:40:00Z' },
  { id: 'r3', subject: 'Delay in feedback on my application', from: 'Sample Applicant B', channel: 'Complaint', status: 'Open', receivedAt: '2026-11-04T09:18:00Z' },
]

export const readinessChecks = [
  { area: 'Netlify Database (records, drafts, audit)', state: 'Planned — Milestone 2' },
  { area: 'Customer & office authentication', state: 'Planned — Milestone 3' },
  { area: 'OneDrive private document filing (Microsoft Graph)', state: 'Awaiting Microsoft app registration' },
  { area: 'Application PDF pack generation', state: 'Planned — Milestone 6' },
  { area: 'Transactional email delivery', state: 'Awaiting verified sender address' },
  { area: 'AI summaries & enquiry scoring', state: 'Planned — Milestone 8' },
] as const
