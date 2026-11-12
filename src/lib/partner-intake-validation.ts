import { z } from 'zod'

/**
 * Partner starter records intentionally accept only non-sensitive referral
 * information. The applicant supplies identity, address, income and banking
 * details later through their own verified customer account.
 */
export const partnerApplicantIntakeInput = z.object({
  applicantEmail: z.string().trim().email().max(254),
  applicantType: z.enum(['individual', 'business']),
  applicantName: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(40).optional(),
  category: z.enum(['vehicle', 'equipment', 'commercial-asset', 'other']),
  assetTypeId: z.string().uuid(),
}).strict()
