export type ApplicantStorageType = 'individual' | 'business'

const CATEGORY_BY_DOCUMENT_TYPE: Record<string, string> = {
  id: 'identity',
  'directors-id': 'identity',
  licence: 'identity',
  address: 'proof-of-address',
  payslips: 'income-bank-statements',
  bank: 'income-bank-statements',
  income: 'income-bank-statements',
  cipc: 'business-documents',
  afs: 'business-documents',
  resolution: 'business-documents',
  quote: 'quotations',
  contracts: 'additional-documents',
  motivation: 'additional-documents',
}

export const INDIVIDUAL_DOCUMENT_FOLDERS = [
  'application-pdf',
  'identity',
  'proof-of-address',
  'income-bank-statements',
  'quotations',
  'additional-documents',
] as const

export const BUSINESS_DOCUMENT_FOLDERS = [
  'application-pdf',
  'identity',
  'proof-of-address',
  'income-bank-statements',
  'business-documents',
  'quotations',
  'additional-documents',
] as const

export function documentStorageCategory(documentType: string): string {
  return CATEGORY_BY_DOCUMENT_TYPE[documentType] ?? 'additional-documents'
}

export function sanitizeStorageFolderName(value: string): string {
  const cleaned = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\.{2,}/g, '').replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim()
    .slice(0, 100)
  return cleaned || 'Applicant'
}

export function applicantStoragePrefix(input: {
  applicantType: ApplicantStorageType
  applicantName: string
  applicationReference: string
}): string {
  const root = input.applicantType === 'business' ? 'Business' : 'Individual'
  const name = sanitizeStorageFolderName(input.applicantName)
  const reference = sanitizeStorageFolderName(input.applicationReference).replace(/\s/g, '-')
  if (!reference || reference === 'Applicant') throw new Error('A valid application reference is required for document storage.')
  return `${root}/${name} - ${reference}`
}

export function applicationDocumentStoragePath(input: {
  applicantType: ApplicantStorageType
  applicantName: string
  applicationReference: string
  documentType: string
  fileName: string
}): string {
  const folder = documentStorageCategory(input.documentType)
  const safeFileName = sanitizeStorageFolderName(input.fileName).replace(/\s/g, '-')
  return `${applicantStoragePrefix(input)}/${folder}/${safeFileName}`
}
