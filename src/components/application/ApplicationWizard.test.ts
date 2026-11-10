import { describe, expect, it } from 'vitest'
import { getDocumentChecklist } from '@/lib/finance-config'
import {
  createLocalDraftForm,
  findFirstInvalidApplicationStep,
  type ApplicationForm,
} from './ApplicationWizard'

const completeIndividualApplication: ApplicationForm = {
  applicantType: 'individual',
  category: 'vehicle',
  firstName: 'Amina',
  lastName: 'Dlamini',
  email: 'amina@example.co.za',
  phone: '+27 82 123 4567',
  idType: 'sa-id',
  idNumber: '8001015009087',
  dateOfBirth: '1980-01-01',
  address: '10 Main Road, Newcastle',
  employmentStatus: 'Permanently employed',
  employer: 'Example Employer',
  grossMonthlyIncome: '30000',
  netMonthlyIncome: '22000',
  businessName: '',
  tradingName: '',
  entityType: '',
  registrationNumber: '',
  yearsTrading: '',
  industry: '',
  businessAddress: '',
  contactName: '',
  annualTurnover: '',
  directors: [{ name: '', role: 'Director' }],
  amount: '500000',
  term: '60',
  deposit: '',
  assetDescription: 'Pre-owned passenger vehicle',
  assetIndustryId: '11111111-1111-4111-8111-111111111111',
  assetCategoryId: '22222222-2222-4222-8222-222222222222',
  assetTypeId: '33333333-3333-4333-8333-333333333333',
  timing: 'Within 30 days',
  supplier: '',
  referralCode: '',
  comments: '',
  consentAccuracy: true,
  consentProcessing: true,
  consentShareProviders: true,
  consentCreditCheck: true,
  consentMarketing: false,
}

describe('complete application validation', () => {

  it('keeps personal, identity, financial and business details out of browser drafts', () => {
    expect(createLocalDraftForm(completeIndividualApplication)).toEqual({
      applicantType: 'individual',
      category: 'vehicle',
      assetIndustryId: '11111111-1111-4111-8111-111111111111',
      assetCategoryId: '22222222-2222-4222-8222-222222222222',
      assetTypeId: '33333333-3333-4333-8333-333333333333',
      referralCode: '',
    })
  })
  it('uses a sole proprietor document checklist instead of CIPC and director requirements', () => {
    const checklist = getDocumentChecklist('business', 'vehicle', 'Sole proprietor')
    expect(checklist.some((item) => item.id === 'id' && item.required)).toBe(true)
    expect(checklist.some((item) => item.id === 'bank' && item.required)).toBe(true)
    expect(checklist.some((item) => item.id === 'cipc' && item.required)).toBe(false)
    expect(checklist.some((item) => item.id === 'directors-id')).toBe(false)
  })

  it('accepts a complete individual application', () => {
    expect(findFirstInvalidApplicationStep(completeIndividualApplication)).toBeNull()
  })

  it('accepts a sole proprietor without a company registration number or director list', () => {
    const soleProprietorApplication: ApplicationForm = {
      ...completeIndividualApplication,
      applicantType: 'business', firstName: '', lastName: '', idType: '', idNumber: '',
      dateOfBirth: '', address: '', employmentStatus: '', employer: '',
      grossMonthlyIncome: '', netMonthlyIncome: '',
      businessName: 'Amina Dlamini Trading', contactName: 'Amina Dlamini',
      entityType: 'Sole proprietor', registrationNumber: '',
      businessAddress: '10 Main Road, Newcastle', industry: 'Transport',
      yearsTrading: '3', annualTurnover: '450000',
      directors: [{ name: '', role: 'Director' }],
    }
    expect(findFirstInvalidApplicationStep(soleProprietorApplication)).toBeNull()
  })

  it('returns to the identity step when a restored draft has no ID number', () => {
    const restoredDraft = { ...completeIndividualApplication, idNumber: '' }
    const result = findFirstInvalidApplicationStep(restoredDraft)

    expect(result?.stepIndex).toBe(2)
    expect(result?.errors.idNumber).toBe('A South African ID number has 13 digits.')
  })

  it('returns to the first incomplete step rather than allowing consent-only submission', () => {
    const incompleteDraft = {
      ...completeIndividualApplication,
      email: '',
      idNumber: '',
    }
    const result = findFirstInvalidApplicationStep(incompleteDraft)

    expect(result?.stepIndex).toBe(1)
    expect(result?.errors.email).toBe('Enter a valid email address.')
  })

  it('still requires the mandatory consents after all application details are complete', () => {
    const missingConsent = { ...completeIndividualApplication, consentShareProviders: false }
    const result = findFirstInvalidApplicationStep(missingConsent)

    expect(result?.stepIndex).toBe(6)
    expect(result?.errors.consentShareProviders).toBe('Consent to share with finance providers is required.')
  })
})
