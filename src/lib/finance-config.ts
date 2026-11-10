/**
 * Finance category presentation defaults and applicant document requirements.
 * Public product names, descriptions and active state are overridden by the
 * Netlify Database finance_products catalogue when seeded and available.
 * Office-managed public copy is read from the whitelisted site_content keys.
 */
import { Building2, Car, Package, Truck, type LucideIcon } from 'lucide-react'
import type { ApplicantType, FinanceCategoryId } from './domain'

// Shared, import-free domain types live in `domain.ts`. Re-exported here so existing imports keep working.
export { applicationStatuses } from './domain'
export type { ApplicantType, ApplicationStatus, FinanceCategoryId } from './domain'

export interface FinanceCategory {
  id: FinanceCategoryId
  name: string
  /** OneDrive folder name, exactly as specified in the filing hierarchy. */
  folderName: string
  short: string
  description: string
  examples: string[]
  image: string
  icon: LucideIcon
}

export const applicantTypes: Record<ApplicantType, { label: string; folderName: string; blurb: string }> = {
  individual: {
    label: 'Individual',
    folderName: 'Individual',
    blurb: 'Apply in your personal capacity — salaried, self-employed or a sole proprietor.',
  },
  business: {
    label: 'Business',
    folderName: 'Business',
    blurb: 'Apply on behalf of a registered company, close corporation, trust or partnership.',
  },
}

export const financeCategories: FinanceCategory[] = [
  {
    id: 'vehicle',
    name: 'Vehicle Finance',
    folderName: 'Vehicle Finance',
    short: 'Passenger and light commercial vehicles',
    description:
      'Finance for new and pre-owned passenger vehicles, bakkies and light commercial vehicles, for private or business use.',
    examples: ['Passenger vehicles', 'Bakkies & LDVs', 'Fleet replacements'],
    image: 'vehicle.png',
    icon: Car,
  },
  {
    id: 'equipment',
    name: 'Equipment Finance',
    folderName: 'Equipment Finance',
    short: 'Plant, machinery and operational equipment',
    description:
      'Structured finance for yellow metal, machinery, agricultural, medical and specialised operational equipment.',
    examples: ['Earthmoving & plant', 'Agricultural machinery', 'Medical & technical equipment'],
    image: 'equipment.png',
    icon: Package,
  },
  {
    id: 'commercial-asset',
    name: 'Commercial Asset Finance',
    folderName: 'Commercial Asset Finance',
    short: 'Trucks, trailers and income-generating assets',
    description:
      'Finance for heavy commercial vehicles, trailers, logistics fleets and other income-generating commercial assets.',
    examples: ['Trucks & trailers', 'Logistics fleets', 'Income-generating assets'],
    image: 'commercial.png',
    icon: Truck,
  },
  {
    id: 'other',
    name: 'Other Finance',
    folderName: 'Other Finance',
    short: 'Specialised requirements, assessed case by case',
    description:
      'Requirements that fall outside the standard categories. Describe what you need and our team will assess suitable provider options.',
    examples: ['Specialised assets', 'Mixed asset packages', 'Bespoke requirements'],
    image: 'about.png',
    icon: Building2,
  },
]

export const getCategory = (id: string | undefined) => financeCategories.find((c) => c.id === id)

export interface DocumentRequirement {
  id: string
  label: string
  note?: string
  required: boolean
}

const individualDocs: DocumentRequirement[] = [
  { id: 'id', label: 'South African ID or passport', required: true },
  { id: 'payslips', label: 'Latest 3 months’ payslips', note: 'Or proof of income if self-employed', required: true },
  { id: 'bank', label: 'Latest 3 months’ bank statements', required: true },
  { id: 'address', label: 'Proof of residential address', note: 'Not older than 3 months', required: true },
  { id: 'licence', label: 'Driver’s licence', required: false },
]

const businessDocs: DocumentRequirement[] = [
  { id: 'cipc', label: 'Company registration documents (CIPC)', required: true },
  { id: 'directors-id', label: 'ID documents of directors / members', required: true },
  { id: 'afs', label: 'Latest annual financial statements', note: 'Or management accounts if newer than 12 months', required: true },
  { id: 'bank', label: 'Latest 6 months’ business bank statements', required: true },
  { id: 'resolution', label: 'Resolution authorising the application', required: true },
  { id: 'address', label: 'Proof of business address', required: false },
]

const categoryDocs: Record<FinanceCategoryId, DocumentRequirement[]> = {
  vehicle: [{ id: 'quote', label: 'Vehicle quotation or offer to purchase', note: 'If a vehicle has been selected', required: false }],
  equipment: [{ id: 'quote', label: 'Supplier quotation or pro-forma invoice', required: true }],
  'commercial-asset': [
    { id: 'quote', label: 'Supplier quotation or pro-forma invoice', required: true },
    { id: 'contracts', label: 'Supporting contracts or work orders', note: 'Where the asset generates income', required: false },
  ],
  other: [{ id: 'motivation', label: 'Short written motivation of the requirement', required: false }],
}

const soleProprietorDocs: DocumentRequirement[] = [
  { id: 'id', label: 'South African ID or passport of the proprietor', required: true },
  { id: 'income', label: 'Proof of income or business trading', note: 'For example, invoices, contracts or other trading records', required: true },
  { id: 'bank', label: 'Latest 3 months’ personal or business bank statements', required: true },
  { id: 'address', label: 'Proof of residential or business address', note: 'Not older than 3 months', required: true },
  { id: 'cipc', label: 'CIPC or other registration documents, if applicable', required: false },
]

export function getDocumentChecklist(type: ApplicantType, category: FinanceCategoryId, entityType?: string) {
  const baseDocs = type === 'individual'
    ? individualDocs
    : entityType === 'Sole proprietor'
      ? soleProprietorDocs
      : businessDocs
  return [...baseDocs, ...categoryDocs[category]]
}

/** Category-specific fields shown in the "Finance requirement" step. */
export const categoryAssetLabel: Record<FinanceCategoryId, string> = {
  vehicle: 'Vehicle make, model and year',
  equipment: 'Equipment description',
  'commercial-asset': 'Asset description',
  other: 'Describe your finance requirement',
}

export const intermediaryDisclaimer =
  'Oxford Business Group is a finance intermediary, not a bank or lender. All finance is subject to assessment and approval by the relevant finance provider, and no approval is guaranteed.'

export const documentCollectionNotice =
  'Private document collection is not yet enabled. Please do not send ID documents, bank statements or other sensitive information through general enquiry forms or email.'
