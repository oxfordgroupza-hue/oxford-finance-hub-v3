const ALWAYS_ALLOWED_PARTNER_DOCUMENT_TYPES = new Set(['quote'])
const OPTIONAL_PARTNER_DOCUMENT_TYPES = new Set(['contracts', 'motivation'])

/**
 * Partners may always add the supplier quote to their own referred application.
 * Additional supplier documents require the per-partner Super Admin permission.
 * Applicant identity, address, income and bank documents are never partner-uploadable.
 */
export function isPartnerDocumentTypeAllowed(
  documentType: string,
  canUploadSupportingDocuments: boolean,
): boolean {
  if (ALWAYS_ALLOWED_PARTNER_DOCUMENT_TYPES.has(documentType)) return true
  return canUploadSupportingDocuments && OPTIONAL_PARTNER_DOCUMENT_TYPES.has(documentType)
}
