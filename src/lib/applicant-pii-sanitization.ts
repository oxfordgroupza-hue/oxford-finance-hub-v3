/** Top-level applicant fields that must never remain in plaintext JSON records. */
export const applicantPiiFields = [
  'firstName', 'lastName', 'businessName', 'tradingName', 'email', 'phone',
  'supplier', 'applicantName', 'contactName', 'comments', 'idType', 'idNumber',
  'dateOfBirth', 'address', 'employmentStatus', 'employer', 'grossMonthlyIncome',
  'netMonthlyIncome', 'registrationNumber', 'yearsTrading', 'industry',
  'businessAddress', 'annualTurnover', 'directors',
] as const

/** Return a shallow copy with applicant PII fields removed from the record. */
export function withoutApplicantPii(data: Record<string, unknown>): Record<string, unknown> {
  const safe = { ...data }
  for (const key of applicantPiiFields) delete safe[key]
  return safe
}
