import { useEffect, useMemo, useRef, useState } from 'react'
import { getUser } from '@netlify/identity'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, FileText, Lock, Plus, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { PreviewNotice } from '@/components/site/PreviewNotice'
import {
  applicantTypes,
  documentCollectionNotice,
  financeCategories,
  getCategory,
  getDocumentChecklist,
  intermediaryDisclaimer,
  type ApplicantType,
  type FinanceCategoryId,
} from '@/lib/finance-config'
import { formatZAR } from '@/lib/format'
import { calculateFinanceAmount } from '@/lib/fee-calculation'
import { cn } from '@/lib/utils'
import { submitFinanceApplication, saveFinanceDraft, loadMyFinanceDraft, deleteMyFinanceDraft, loadMyOfficeApplicationDraft, saveMyOfficeApplicationDraft } from '@/lib/application-actions'
import { getPublicAssetCatalogue } from '@/lib/catalog-actions'

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

interface Director {
  name: string
  role: string
}

export interface ApplicationForm {
  applicantType?: ApplicantType
  category?: FinanceCategoryId
  // individual details
  firstName: string
  lastName: string
  email: string
  phone: string
  idType: string
  idNumber: string
  dateOfBirth: string
  address: string
  employmentStatus: string
  employer: string
  grossMonthlyIncome: string
  netMonthlyIncome: string
  // business details
  businessName: string
  tradingName: string
  entityType: string
  registrationNumber: string
  yearsTrading: string
  industry: string
  businessAddress: string
  contactName: string
  annualTurnover: string
  directors: Director[]
  // finance requirement
  amount: string
  term: string
  deposit: string
  assetDescription: string
  assetIndustryId: string
  assetCategoryId: string
  assetTypeId: string
  timing: string
  supplier: string
  referralCode: string
  comments: string
  // consents
  consentAccuracy: boolean
  consentProcessing: boolean
  consentShareProviders: boolean
  consentCreditCheck: boolean
  consentMarketing: boolean
}

const emptyForm: ApplicationForm = {
  firstName: '', lastName: '', email: '', phone: '', idType: 'sa-id', idNumber: '', dateOfBirth: '', address: '',
  employmentStatus: '', employer: '', grossMonthlyIncome: '', netMonthlyIncome: '',
  businessName: '', tradingName: '', entityType: '', registrationNumber: '', yearsTrading: '', industry: '',
  businessAddress: '', contactName: '', annualTurnover: '', directors: [{ name: '', role: 'Director' }],
  amount: '', term: '60', deposit: '', assetDescription: '', assetIndustryId: '', assetCategoryId: '', assetTypeId: '', timing: '', supplier: '', referralCode: '', comments: '',
  consentAccuracy: false, consentProcessing: false, consentShareProviders: false, consentCreditCheck: false, consentMarketing: false,
}

type StepId = 'path' | 'details' | 'identity' | 'financial' | 'finance' | 'documents' | 'review'

const stepsFor = (type?: ApplicantType): { id: StepId; label: string }[] => [
  { id: 'path', label: 'Applicant & category' },
  { id: 'details', label: type === 'business' ? 'Business details' : 'Personal details' },
  { id: 'identity', label: type === 'business' ? 'Registration & directors' : 'Identity & address' },
  { id: 'financial', label: type === 'business' ? 'Business finances' : 'Employment & income' },
  { id: 'finance', label: 'Finance requirement' },
  { id: 'documents', label: 'Supporting documents' },
  { id: 'review', label: 'Review & consent' },
]

/** Browser drafts retain only non-identifying navigation details. */
const LEGACY_DRAFT_KEY = 'ofh.preview.draft.v1'
const DRAFT_KEY = 'ofh.preview.draft.v2'

/** Keep personal, identity, contact, financial and business details out of localStorage. */
export function createLocalDraftForm(form: ApplicationForm): Partial<ApplicationForm> {
  return {
    applicantType: form.applicantType,
    category: form.category,
    assetIndustryId: form.assetIndustryId,
    assetCategoryId: form.assetCategoryId,
    assetTypeId: form.assetTypeId,
    referralCode: form.referralCode,
  }
}

/** Remove the previous browser-draft version, which could contain unencrypted personal details. */
function removeLegacyStoredDraft(): void {
  try {
    window.localStorage.removeItem(LEGACY_DRAFT_KEY)
  } catch {
    // Storage may be disabled; do not block the application form.
  }
}

/** Browser storage can be disabled or full; draft failures must not crash the wizard. */
function removeStoredDraft(): boolean {
  try {
    window.localStorage.removeItem(DRAFT_KEY)
    return true
  } catch {
    return false
  }
}

type Errors = Partial<Record<string, string>>

const required = (v: string) => v.trim().length > 0
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())
const phoneOk = (v: string) => /^[+()\d\s-]{9,}$/.test(v.trim())
const numOk = (v: string) => v.trim() !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0

function validate(step: StepId, f: ApplicationForm): Errors {
  const e: Errors = {}
  const need = (key: keyof ApplicationForm, msg: string) => {
    if (!required(String(f[key] ?? ''))) e[key] = msg
  }
  const biz = f.applicantType === 'business'
  switch (step) {
    case 'path':
      if (!f.applicantType) e.applicantType = 'Choose whether you are applying as an individual or a business.'
      if (!f.category) e.category = 'Choose a finance category.'
      break
    case 'details':
      if (biz) {
        need('businessName', 'Enter the registered business name.')
        need('contactName', 'Enter the name of the authorised contact person.')
      } else {
        need('firstName', 'Enter your first name.')
        need('lastName', 'Enter your surname.')
      }
      if (!emailOk(f.email)) e.email = 'Enter a valid email address.'
      if (!phoneOk(f.phone)) e.phone = 'Enter a valid phone number, including the area code.'
      break
    case 'identity':
      if (biz) {
        need('entityType', 'Select the type of entity.')
        if (f.entityType !== 'Sole proprietor') {
          need('registrationNumber', 'Enter the registration number.')
          if (!f.directors.some((d) => required(d.name))) e.directors = 'Add at least one director or authorised representative.'
        }
        need('businessAddress', 'Enter the business address.')
      } else {
        if (f.idType === 'sa-id' && !/^\d{13}$/.test(f.idNumber.trim())) e.idNumber = 'A South African ID number has 13 digits.'
        if (f.idType === 'passport') need('idNumber', 'Enter your passport number.')
        need('dateOfBirth', 'Enter your date of birth.')
        need('address', 'Enter your residential address.')
      }
      break
    case 'financial':
      if (biz) {
        need('industry', 'Enter your industry or sector.')
        if (!numOk(f.yearsTrading)) e.yearsTrading = 'Enter the number of years trading.'
        if (!numOk(f.annualTurnover)) e.annualTurnover = 'Enter an approximate annual turnover.'
      } else {
        need('employmentStatus', 'Select your employment status.')
        if (!numOk(f.grossMonthlyIncome)) e.grossMonthlyIncome = 'Enter your gross monthly income.'
        if (!numOk(f.netMonthlyIncome)) e.netMonthlyIncome = 'Enter your net monthly income.'
      }
      break
    case 'finance':
      if (!numOk(f.amount) || Number(f.amount) < 10000) e.amount = 'Enter the principal loan amount (minimum R10 000).'
      need('term', 'Select a preferred term.')
      need('assetIndustryId', 'Select an industry.')
      need('assetCategoryId', 'Select an asset category.')
      need('assetTypeId', 'Select the equipment or asset type.')
      need('assetDescription', 'Select the equipment or asset type.')
      need('timing', 'Select when you need the finance.')
      if (f.deposit && !numOk(f.deposit)) e.deposit = 'Enter the deposit as a number, or leave it blank.'
      break
    case 'review':
      if (!f.consentAccuracy) e.consentAccuracy = 'Confirm that the information is accurate.'
      if (!f.consentProcessing) e.consentProcessing = 'Consent to processing is required to assess your application.'
      if (!f.consentShareProviders) e.consentShareProviders = 'Consent to share with finance providers is required.'
      if (!f.consentCreditCheck) e.consentCreditCheck = 'Consent to credit checks by providers is required.'
      break
  }
  return e
}

/**
 * Validate every application step in order. This is also used at final submission:
 * a restored local draft may be missing sensitive fields that were deliberately
 * excluded from browser storage, so validating only the consent step is unsafe.
 */
export function findFirstInvalidApplicationStep(form: ApplicationForm): { stepIndex: number; errors: Errors } | null {
  const steps = stepsFor(form.applicantType)
  for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
    const errors = validate(steps[stepIndex].id, form)
    if (Object.keys(errors).length > 0) return { stepIndex, errors }
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Field helpers                                                       */
/* ------------------------------------------------------------------ */

function Field({
  id, label, error, hint, children, className,
}: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={id} className="text-sm text-foreground/90">{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-xs text-[oklch(0.75_0.15_27)]">{error}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Wizard                                                              */
/* ------------------------------------------------------------------ */

export function ApplicationWizard({
  initialType, initialCategory, referralFromLink, initialDraftId, initialApplicationId,
}: { initialType?: ApplicantType; initialCategory?: FinanceCategoryId; referralFromLink?: string; initialDraftId?: string; initialApplicationId?: string }) {
  const [form, setForm] = useState<ApplicationForm>(() => ({
    ...emptyForm,
    applicantType: initialType,
    category: initialCategory,
    referralCode: referralFromLink ?? '',
  }))
  const [stepIndex, setStepIndex] = useState(0)
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)
  const [submittedRef, setSubmittedRef] = useState<string | null>(null)
  const [restoredDraft, setRestoredDraft] = useState(false)
  const [serverDraftId, setServerDraftId] = useState<string | null>(initialDraftId ?? null)
  const [assetCatalogue, setAssetCatalogue] = useState<{
    industries: Array<{ id: string; name: string; description: string; sortOrder: number }>
    categories: Array<{ id: string; industryId: string; financeCategory: FinanceCategoryId; name: string; description: string; sortOrder: number }>
    types: Array<{ id: string; categoryId: string; name: string; description: string; sortOrder: number }>
  }>({ industries: [], categories: [], types: [] })
  const [assetCatalogueLoading, setAssetCatalogueLoading] = useState(true)
  const idempotencyKey = useRef<string | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const steps = useMemo(() => stepsFor(form.applicantType), [form.applicantType])
  const step = steps[stepIndex]
  const referralLocked = Boolean(referralFromLink || serverDraftId || initialApplicationId)

  useEffect(() => {
    let active = true
    void getPublicAssetCatalogue().then((catalogue) => {
      if (active) setAssetCatalogue(catalogue)
    }).catch((error: unknown) => {
      if (active) toast.error(error instanceof Error ? error.message : 'The equipment catalogue could not be loaded.')
    }).finally(() => {
      if (active) setAssetCatalogueLoading(false)
    })
    return () => { active = false }
  }, [])

  // Restore an account draft first when its ID is present; otherwise restore this-device draft.
  useEffect(() => {
    let active = true
    removeLegacyStoredDraft()
    if (initialApplicationId) {
      void loadMyOfficeApplicationDraft({ data: { applicationId: initialApplicationId } }).then((saved) => {
        if (!active) return
        const restoredForm = saved.form as Partial<ApplicationForm>
        setForm((current) => ({
          ...current,
          ...restoredForm,
          applicantType: initialType ?? restoredForm.applicantType,
          category: initialCategory ?? restoredForm.category,
          referralCode: typeof restoredForm.referralCode === 'string' ? restoredForm.referralCode : '',
        }))
        setStepIndex(Math.max(0, Math.min(saved.stepIndex, 6)))
        setRestoredDraft(true)
      }).catch((error: unknown) => {
        if (active) toast.error(error instanceof Error ? error.message : 'The assisted application could not be restored.')
      })
      return () => { active = false }
    }
    if (initialDraftId) {
      void loadMyFinanceDraft({ data: { draftId: initialDraftId } }).then((saved) => {
        if (!active) return
        const restoredForm = saved.form as Partial<ApplicationForm>
        setForm((current) => ({
          ...current,
          ...restoredForm,
          idNumber: '',
          applicantType: initialType ?? restoredForm.applicantType,
          category: initialCategory ?? restoredForm.category,
          referralCode: typeof restoredForm.referralCode === 'string' ? restoredForm.referralCode : (referralFromLink ?? ''),
        }))
        setStepIndex(Math.max(0, Math.min(saved.stepIndex, 6)))
        setRestoredDraft(true)
      }).catch((error: unknown) => {
        if (active) toast.error(error instanceof Error ? error.message : 'The saved draft could not be restored.')
      })
      return () => { active = false }
    }

    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (!raw) return
        const saved = JSON.parse(raw) as { form: Partial<ApplicationForm>; stepIndex: number }
        setForm((current) => ({
          ...current,
          ...saved.form,
          applicantType: initialType ?? saved.form.applicantType,
          category: initialCategory ?? saved.form.category,
          referralCode: referralFromLink ?? saved.form.referralCode ?? '',
        }))
        const savedStepIndex = Number.isInteger(saved.stepIndex)
          ? Math.max(0, Math.min(saved.stepIndex, 6))
          : 0
        setStepIndex(savedStepIndex)
        setRestoredDraft(true)
      } catch {
        removeStoredDraft()
      }
    }, 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [initialType, initialCategory, referralFromLink, initialDraftId, initialApplicationId])

  const update = <K extends keyof ApplicationForm>(key: K, value: ApplicationForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const saveDraft = async (silent = false, nextIndex = stepIndex) => {
    // Server drafts are encrypted before persistence; ID numbers remain excluded.
    const accountSafe: Partial<ApplicationForm> = { ...form }
    if (!initialApplicationId) delete accountSafe.idNumber
    const localSafe = createLocalDraftForm(form)
    let localSaved = false
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: localSafe, stepIndex: nextIndex, savedAt: new Date().toISOString() }))
      localSaved = true
    } catch {
      if (!silent) toast.error('This browser could not save a local draft.')
    }

    if (initialApplicationId) {
      try {
        await saveMyOfficeApplicationDraft({ data: { applicationId: initialApplicationId, stepIndex: nextIndex, form: accountSafe as unknown as Record<string, unknown> } })
        if (!silent) toast.success('Application progress saved securely to your Oxford account')
      } catch (error) {
        if (!silent) toast.error('Your application progress could not be saved.', { description: error instanceof Error ? error.message : 'Please retry the save.' })
      }
      return
    }
    if (form.applicantType && form.category) {
      try {
        const identity = await getUser()
        if (identity) {
          const result = await saveFinanceDraft({
            data: {
              draftId: serverDraftId ?? undefined,
              applicantType: form.applicantType,
              category: form.category,
              stepIndex: nextIndex,
              form: accountSafe as unknown as Record<string, unknown>,
            },
          })
          setServerDraftId(result.id)
          if (!silent) toast.success('Draft saved to your Oxford account', { description: 'Sensitive details are encrypted in your Oxford account draft; ID numbers are not saved.' })
          return
        }
      } catch {
        if (!silent) toast.error('Your secure account draft could not be saved.', {
          description: 'Only your application type, category and referral code were kept in this browser. Your other entries may be lost if you leave this page. Please retry the secure save.',
        })
        return
      }
    }
    if (!silent && localSaved) toast.success('Draft saved on this device', { description: 'Sign in to save and resume drafts across devices. Only your application type, category and referral code are stored in this browser. Sign in to save your full draft securely.' })
  }

  const discardDraft = async () => {
    const removed = removeStoredDraft()
    if (serverDraftId) {
      try { await deleteMyFinanceDraft({ data: { draftId: serverDraftId } }) }
      catch (error) { toast.error(error instanceof Error ? error.message : 'The account draft could not be deleted.') }
    }
    setServerDraftId(null)
    setForm({ ...emptyForm, applicantType: initialType, category: initialCategory, referralCode: referralFromLink ?? '' })
    setStepIndex(0)
    setRestoredDraft(false)
    if (removed) toast('Draft discarded')
    else toast.error('The draft was cleared from this form, but this browser could not remove its saved copy.')
  }

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const next = () => {
    const e = validate(step.id, form)
    setErrors(e)
    if (Object.keys(e).length) {
      toast.error('Please review the highlighted fields')
      return
    }
    const ni = Math.min(stepIndex + 1, steps.length - 1)
    setStepIndex(ni)
    void saveDraft(true, ni)
    scrollTop()
  }

  const back = () => {
    setStepIndex((i) => Math.max(0, i - 1))
    setErrors({})
    scrollTop()
  }

  const submit = async () => {
    if (submitting || submittedRef) return // guard against double clicks

    // Revalidate the full application, not just consent. ID numbers are intentionally
    // excluded from local drafts, so a restored draft must supply them again.
    const invalid = findFirstInvalidApplicationStep(form)
    if (invalid) {
      setErrors(invalid.errors)
      setStepIndex(invalid.stepIndex)
      toast.error('Please review the highlighted fields before submitting')
      scrollTop()
      return
    }

    setErrors({})
    setSubmitting(true)
    try {
      // Reuse the same key for retries so a slow response cannot create duplicate applications.
      idempotencyKey.current ??= crypto.randomUUID()
      let draftId = serverDraftId
      if (!initialApplicationId && !draftId) {
        const secureForm: Partial<ApplicationForm> = { ...form }
        delete secureForm.idNumber
        const saved = await saveFinanceDraft({
          data: {
            applicantType: form.applicantType!,
            category: form.category!,
            stepIndex,
            form: secureForm as unknown as Record<string, unknown>,
          },
        })
        draftId = saved.id
        setServerDraftId(saved.id)
      }
      if (initialApplicationId) {
        await saveMyOfficeApplicationDraft({ data: { applicationId: initialApplicationId, stepIndex, form: form as unknown as Record<string, unknown> } })
      }
      const result = await submitFinanceApplication({
        data: {
          idempotencyKey: idempotencyKey.current,
          form: form as unknown as Record<string, unknown>,
          draftId: initialApplicationId ? undefined : draftId,
          sourceApplicationId: initialApplicationId,
        },
      })
      removeStoredDraft()
      setServerDraftId(null)
      setSubmittedRef(result.reference)
      if (result.duplicate) {
        toast.info('Your application was already received. We have restored its reference.')
      }
      scrollTop()
    } catch (error) {
      toast.error('We could not complete the application. Your draft has been kept.', { description: error instanceof Error ? error.message : 'Please try again later.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (submittedRef) return <Confirmation reference={submittedRef} form={form} />

  const category = getCategory(form.category)
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100)

  return (
    <div ref={topRef} className="grid scroll-mt-28 gap-10 lg:grid-cols-[17rem_1fr]">
      {/* Step rail */}
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground lg:hidden">
          <span>Step {stepIndex + 1} of {steps.length}</span>
          <span>{step.label}</span>
        </div>
        <Progress value={progress} className="h-1 lg:hidden" />
        <ol className="hidden space-y-1 lg:block">
          {steps.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                disabled={i > stepIndex}
                onClick={() => { setStepIndex(i); setErrors({}) }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm transition-colors',
                  i === stepIndex ? 'bg-gold/10 text-gold' : i < stepIndex ? 'text-foreground hover:bg-accent' : 'text-muted-foreground',
                )}
              >
                <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border text-xs',
                  i < stepIndex ? 'border-gold bg-gold text-primary-foreground' : i === stepIndex ? 'border-gold' : 'border-border')}>
                  {i < stepIndex ? <Check className="size-3.5" /> : i + 1}
                </span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>
        <div className="mt-6 hidden space-y-2 border-t border-border pt-6 lg:block">
          <Button type="button" variant="outlineGold" size="sm" className="w-full rounded-sm" onClick={() => void saveDraft()}>
            <Save /> Save draft
          </Button>
          {restoredDraft && !initialApplicationId && (
            <Button type="button" variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={discardDraft}>
              <Trash2 /> Discard draft
            </Button>
          )}
        </div>
      </aside>

      {/* Step body */}
      <div className="min-w-0">
        {restoredDraft && stepIndex === 0 && (
          <PreviewNotice className="mb-6">We restored your saved draft. Continue where you left off, or discard it to start again.</PreviewNotice>
        )}
        <div className="rounded-sm border border-border bg-card p-6 sm:p-10">
          <p className="eyebrow">Step {stepIndex + 1} of {steps.length}</p>
          <h2 className="mt-3 text-3xl font-medium sm:text-4xl">{step.label}</h2>
          {category && step.id !== 'path' && (
            <p className="mt-2 text-sm text-muted-foreground">
              {applicantTypes[form.applicantType!].label} · {category.name}
            </p>
          )}
          <div className="gold-rule my-8 opacity-40" />

          {step.id === 'path' && <PathStep form={form} errors={errors} update={update} referralLocked={referralLocked} />}
          {step.id === 'details' && <DetailsStep form={form} errors={errors} update={update} />}
          {step.id === 'identity' && <IdentityStep form={form} errors={errors} update={update} setErrors={setErrors} />}
          {step.id === 'financial' && <FinancialStep form={form} errors={errors} update={update} />}
          {step.id === 'finance' && <FinanceStep form={form} errors={errors} update={update} catalogue={assetCatalogue} catalogueLoading={assetCatalogueLoading} />}
          {step.id === 'documents' && <DocumentsStep form={form} />}
          {step.id === 'review' && <ReviewStep form={form} errors={errors} update={update} goTo={setStepIndex} />}

          <div className="mt-10 flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={back} disabled={stepIndex === 0}>
              <ArrowLeft /> Back
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="button" variant="outlineGold" className="rounded-sm lg:hidden" onClick={() => saveDraft()}>
                <Save /> Save draft
              </Button>
              {step.id === 'review' ? (
                <Button type="button" variant="gold" size="lg" className="rounded-sm" onClick={submit} disabled={submitting} aria-busy={submitting}>
                  {submitting ? 'Submitting…' : 'Submit application'}
                </Button>
              ) : (
                <Button type="button" variant="gold" size="lg" className="rounded-sm" onClick={next}>
                  Continue <ArrowRight />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

type StepProps = {
  form: ApplicationForm
  errors: Errors
  update: <K extends keyof ApplicationForm>(key: K, value: ApplicationForm[K]) => void
}

function PathStep({ form, errors, update, referralLocked }: StepProps & { referralLocked: boolean }) {
  return (
    <div className="space-y-10">
      <fieldset>
        <legend className="mb-4 text-sm font-medium">I am applying as</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(applicantTypes) as ApplicantType[]).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={form.applicantType === t}
              onClick={() => update('applicantType', t)}
              className={cn('rounded-sm border p-5 text-left transition-colors',
                form.applicantType === t ? 'border-gold bg-gold/10' : 'border-border hover:border-gold/50')}
            >
              <span className="flex items-center justify-between">
                <span className="font-display text-2xl">{applicantTypes[t].label}</span>
                {form.applicantType === t && <CheckCircle2 className="size-5 text-gold" />}
              </span>
              <span className="mt-2 block text-sm text-muted-foreground">{applicantTypes[t].blurb}</span>
            </button>
          ))}
        </div>
        {errors.applicantType && <p className="mt-2 text-xs text-[oklch(0.75_0.15_27)]">{errors.applicantType}</p>}
      </fieldset>
      <fieldset>
        <legend className="mb-4 text-sm font-medium">Finance category</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {financeCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={form.category === c.id}
              onClick={() => update('category', c.id)}
              className={cn('flex gap-4 rounded-sm border p-5 text-left transition-colors',
                form.category === c.id ? 'border-gold bg-gold/10' : 'border-border hover:border-gold/50')}
            >
              <c.icon className="mt-1 size-5 shrink-0 text-gold" aria-hidden="true" />
              <span>
                <span className="block font-medium">{c.name}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{c.short}</span>
              </span>
            </button>
          ))}
        </div>
        {errors.category && <p className="mt-2 text-xs text-[oklch(0.75_0.15_27)]">{errors.category}</p>}
      </fieldset>
      <Field id="referralCode" label="Partner referral code (optional)" hint={referralLocked ? undefined : 'If an Oxford partner referred you, enter their code before saving your draft.'}>
        <div className="relative">
          <Input id="referralCode" value={form.referralCode} readOnly={referralLocked} aria-readonly={referralLocked}
            className={cn(referralLocked && 'border-gold/50 bg-gold/5 pr-9 text-gold')}
            onChange={(e) => update('referralCode', e.target.value.toUpperCase())} />
          {referralLocked && <Lock className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-gold" aria-hidden="true" />}
        </div>
        {referralLocked && <p className="text-xs text-gold/80">Applied from your partner’s referral link.</p>}
      </Field>
    </div>
  )
}

function DetailsStep({ form, errors, update }: StepProps) {
  const biz = form.applicantType === 'business'
  const text = (key: keyof ApplicationForm, label: string, props: React.ComponentProps<'input'> = {}, hint?: string) => (
    <Field id={key} label={label} error={errors[key]} hint={hint}>
      <Input id={key} value={String(form[key] ?? '')} aria-invalid={Boolean(errors[key])} onChange={(e) => update(key, e.target.value as never)} {...props} />
    </Field>
  )
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {biz ? (
        <>
          {text('businessName', 'Registered business name', { autoComplete: 'organization' })}
          {text('tradingName', 'Trading name (if different)')}
          {text('contactName', 'Authorised contact person', { autoComplete: 'name' })}
        </>
      ) : (
        <>
          {text('firstName', 'First name(s)', { autoComplete: 'given-name' })}
          {text('lastName', 'Surname', { autoComplete: 'family-name' })}
        </>
      )}
      {text('email', 'Email address', { type: 'email', autoComplete: 'email' }, 'We send your application reference and status updates here.')}
      {text('phone', 'Mobile number', { type: 'tel', autoComplete: 'tel', placeholder: '+27' })}
    </div>
  )
}

function IdentityStep({ form, errors, update, setErrors }: StepProps & { setErrors: React.Dispatch<React.SetStateAction<Errors>> }) {
  if (form.applicantType === 'business') {
    const setDirector = (i: number, patch: Partial<Director>) => {
      update('directors', form.directors.map((d, j) => (j === i ? { ...d, ...patch } : d)))
      setErrors((e) => ({ ...e, directors: undefined }))
    }
    return (
      <div className="space-y-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="entityType" label="Entity type" error={errors.entityType}>
            <Select value={form.entityType} onValueChange={(v) => update('entityType', v)}>
              <SelectTrigger id="entityType" className="w-full" aria-invalid={Boolean(errors.entityType)}><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {['Private company (Pty) Ltd', 'Public company', 'Close corporation', 'Trust', 'Partnership', 'Sole proprietor', 'Other'].map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="registrationNumber" label="Registration / reference number" error={errors.registrationNumber} hint={form.entityType === "Sole proprietor" ? "Optional for sole proprietors." : "e.g. 2015/123456/07"}>
            <Input id="registrationNumber" value={form.registrationNumber} aria-invalid={Boolean(errors.registrationNumber)} onChange={(e) => update('registrationNumber', e.target.value)} />
          </Field>
          <Field id="businessAddress" label="Business address" error={errors.businessAddress} className="sm:col-span-2">
            <Textarea id="businessAddress" rows={2} value={form.businessAddress} aria-invalid={Boolean(errors.businessAddress)} onChange={(e) => update('businessAddress', e.target.value)} />
          </Field>
        </div>
        {form.entityType !== 'Sole proprietor' && (
        <fieldset>
          <legend className="mb-3 text-sm font-medium">Directors, members or authorised representatives</legend>
          <div className="space-y-3">
            {form.directors.map((d, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
                <Input aria-label={`Director ${i + 1} full name`} placeholder="Full name" value={d.name} onChange={(e) => setDirector(i, { name: e.target.value })} />
                <Select value={d.role} onValueChange={(v) => setDirector(i, { role: v })}>
                  <SelectTrigger aria-label={`Director ${i + 1} role`} className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Director', 'Member', 'Trustee', 'Partner', 'Authorised signatory'].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon" aria-label={`Remove director ${i + 1}`} disabled={form.directors.length === 1}
                  onClick={() => update('directors', form.directors.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
          {errors.directors && <p className="mt-2 text-xs text-[oklch(0.75_0.15_27)]">{errors.directors}</p>}
          <Button type="button" variant="ghost" size="sm" className="mt-3 text-gold" onClick={() => update('directors', [...form.directors, { name: '', role: 'Director' }])}>
            <Plus /> Add another
          </Button>
        </fieldset>
        )}
      </div>
    )
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Field id="idType" label="Identity document type">
        <Select value={form.idType} onValueChange={(v) => update('idType', v)}>
          <SelectTrigger id="idType" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="sa-id">South African ID</SelectItem>
            <SelectItem value="passport">Passport</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field id="idNumber" label={form.idType === 'passport' ? 'Passport number' : 'ID number'} error={errors.idNumber} hint="Not stored in saved drafts on this device.">
        <Input id="idNumber" inputMode={form.idType === 'sa-id' ? 'numeric' : 'text'} autoComplete="off" value={form.idNumber} aria-invalid={Boolean(errors.idNumber)} onChange={(e) => update('idNumber', e.target.value)} />
      </Field>
      <Field id="dateOfBirth" label="Date of birth" error={errors.dateOfBirth}>
        <Input id="dateOfBirth" type="date" autoComplete="bday" value={form.dateOfBirth} aria-invalid={Boolean(errors.dateOfBirth)} onChange={(e) => update('dateOfBirth', e.target.value)} />
      </Field>
      <Field id="address" label="Residential address" error={errors.address} className="sm:col-span-2">
        <Textarea id="address" rows={2} autoComplete="street-address" value={form.address} aria-invalid={Boolean(errors.address)} onChange={(e) => update('address', e.target.value)} />
      </Field>
    </div>
  )
}

function FinancialStep({ form, errors, update }: StepProps) {
  const money = (key: keyof ApplicationForm, label: string, hint?: string) => (
    <Field id={key} label={label} error={errors[key]} hint={hint}>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">R</span>
        <Input id={key} inputMode="numeric" className="pl-7" value={String(form[key] ?? '')} aria-invalid={Boolean(errors[key])}
          onChange={(e) => update(key, e.target.value.replace(/[^\d.]/g, '') as never)} />
      </div>
    </Field>
  )
  if (form.applicantType === 'business') {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="industry" label="Industry or sector" error={errors.industry}>
          <Input id="industry" value={form.industry} aria-invalid={Boolean(errors.industry)} onChange={(e) => update('industry', e.target.value)} />
        </Field>
        <Field id="yearsTrading" label="Years trading" error={errors.yearsTrading}>
          <Input id="yearsTrading" inputMode="numeric" value={form.yearsTrading} aria-invalid={Boolean(errors.yearsTrading)} onChange={(e) => update('yearsTrading', e.target.value.replace(/[^\d]/g, ''))} />
        </Field>
        {money('annualTurnover', 'Approximate annual turnover', 'As per your latest financial statements or management accounts.')}
      </div>
    )
  }
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Field id="employmentStatus" label="Employment status" error={errors.employmentStatus}>
        <Select value={form.employmentStatus} onValueChange={(v) => update('employmentStatus', v)}>
          <SelectTrigger id="employmentStatus" className="w-full" aria-invalid={Boolean(errors.employmentStatus)}><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {['Permanently employed', 'Contract employed', 'Self-employed', 'Sole proprietor', 'Retired', 'Other'].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field id="employer" label="Employer or business name">
        <Input id="employer" value={form.employer} onChange={(e) => update('employer', e.target.value)} />
      </Field>
      {money('grossMonthlyIncome', 'Gross monthly income')}
      {money('netMonthlyIncome', 'Net monthly income', 'After tax and deductions.')}
    </div>
  )
}

function FinanceStep({
  form, errors, update, catalogue, catalogueLoading,
}: StepProps & {
  catalogue: {
    industries: Array<{ id: string; name: string; description: string; sortOrder: number }>
    categories: Array<{ id: string; industryId: string; financeCategory: FinanceCategoryId; name: string; description: string; sortOrder: number }>
    types: Array<{ id: string; categoryId: string; name: string; description: string; sortOrder: number }>
  }
  catalogueLoading: boolean
}) {
  const selectedCategories = catalogue.categories.filter((item) => item.industryId === form.assetIndustryId)
  const selectedTypes = catalogue.types.filter((item) => item.categoryId === form.assetCategoryId)
  const selectedType = catalogue.types.find((item) => item.id === form.assetTypeId)
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <Field id="amount" label="Principal loan amount" error={errors.amount}>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">R</span>
          <Input id="amount" inputMode="numeric" className="pl-7" value={form.amount} aria-invalid={Boolean(errors.amount)} onChange={(e) => update('amount', e.target.value.replace(/[^\d]/g, ''))} />
        </div>
      </Field>
      <Field id="term" label="Preferred term" error={errors.term}>
        <Select value={form.term} onValueChange={(v) => update('term', v)}>
          <SelectTrigger id="term" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['12', '24', '36', '48', '60', '72', '84'].map((m) => <SelectItem key={m} value={m}>{m} months</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field id="deposit" label="Deposit available (optional)" error={errors.deposit}>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">R</span>
          <Input id="deposit" inputMode="numeric" className="pl-7" value={form.deposit} onChange={(e) => update('deposit', e.target.value.replace(/[^\d]/g, ''))} />
        </div>
      </Field>
      <Field id="timing" label="When do you need the finance?" error={errors.timing}>
        <Select value={form.timing} onValueChange={(v) => update('timing', v)}>
          <SelectTrigger id="timing" className="w-full" aria-invalid={Boolean(errors.timing)}><SelectValue placeholder="Select…" /></SelectTrigger>
          <SelectContent>
            {['Immediately', 'Within 30 days', 'Within 3 months', 'Just exploring options'].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field id="assetIndustryId" label="Industry" error={errors.assetIndustryId} className="sm:col-span-2">
        <Select value={form.assetIndustryId} onValueChange={(id) => {
          update('assetIndustryId', id)
          update('assetCategoryId', '')
          update('assetTypeId', '')
          update('assetDescription', '')
          update('category', undefined)
        }}>
          <SelectTrigger id="assetIndustryId" className="w-full" aria-invalid={Boolean(errors.assetIndustryId)}>
            <SelectValue placeholder={catalogueLoading ? 'Loading industries…' : 'Select an industry'} />
          </SelectTrigger>
          <SelectContent>
            {catalogue.industries.map((industry) => <SelectItem key={industry.id} value={industry.id}>{industry.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field id="assetCategoryId" label="Industry category" error={errors.assetCategoryId} className="sm:col-span-2">
        <Select value={form.assetCategoryId} disabled={!form.assetIndustryId || selectedCategories.length === 0} onValueChange={(id) => {
          const selected = selectedCategories.find((item) => item.id === id)
          update('assetCategoryId', id)
          update('assetTypeId', '')
          update('assetDescription', '')
          update('category', selected?.financeCategory)
        }}>
          <SelectTrigger id="assetCategoryId" className="w-full" aria-invalid={Boolean(errors.assetCategoryId)}>
            <SelectValue placeholder={!form.assetIndustryId ? 'Select an industry first' : 'Select a category'} />
          </SelectTrigger>
          <SelectContent>
            {selectedCategories.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field id="assetTypeId" label="Equipment / vehicle / asset" error={errors.assetTypeId} className="sm:col-span-2">
        <Select value={form.assetTypeId} disabled={!form.assetCategoryId || selectedTypes.length === 0} onValueChange={(id) => {
          const selected = selectedTypes.find((item) => item.id === id)
          update('assetTypeId', id)
          update('assetDescription', selected?.name ?? '')
        }}>
          <SelectTrigger id="assetTypeId" className="w-full" aria-invalid={Boolean(errors.assetTypeId)}>
            <SelectValue placeholder={!form.assetCategoryId ? 'Select a category first' : 'Select equipment or asset'} />
          </SelectTrigger>
          <SelectContent>
            {selectedTypes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      {selectedType?.description && <p className="text-xs text-muted-foreground sm:col-span-2">{selectedType.description}</p>}
      {!catalogueLoading && catalogue.industries.length === 0 && (
        <p className="text-sm text-muted-foreground sm:col-span-2">The equipment catalogue is being configured by Oxford Business Group. Please contact the office before continuing.</p>
      )}
      {form.category !== 'other' && (
        <Field id="supplier" label="Dealer or supplier (if known)">
          <Input id="supplier" value={form.supplier} onChange={(e) => update('supplier', e.target.value)} />
        </Field>
      )}
      <Field id="comments" label="Anything else we should know? (optional)" className="sm:col-span-2">
        <Textarea id="comments" rows={3} value={form.comments} onChange={(e) => update('comments', e.target.value)} />
      </Field>
    </div>
  )
}

function DocumentsStep({ form }: { form: ApplicationForm }) {
  const list = getDocumentChecklist(form.applicantType ?? 'individual', form.category ?? 'other', form.entityType)
  return (
    <div className="space-y-6">
      <p className="leading-relaxed text-muted-foreground">
        These are the documents a finance provider usually needs for a{' '}
        <span className="text-foreground">{applicantTypes[form.applicantType ?? 'individual'].label.toLowerCase()}</span>{' '}
        <span className="text-foreground">{getCategory(form.category)?.name ?? 'finance'}</span> application. Gather them now
        so that your application can move quickly once our office contacts you.
      </p>
      <ul className="divide-y divide-border rounded-sm border border-border">
        {list.map((d) => (
          <li key={d.id} className="flex items-start gap-4 p-4">
            <FileText className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium">{d.label}</p>
              {d.note && <p className="mt-0.5 text-xs text-muted-foreground">{d.note}</p>}
            </div>
            <span className={cn('text-xs', d.required ? 'text-gold' : 'text-muted-foreground')}>{d.required ? 'Required' : 'If applicable'}</span>
          </li>
        ))}
      </ul>
      <PreviewNotice>
        <strong className="font-semibold">Secure upload is not yet open.</strong> {documentCollectionNotice} Our office will
        request documents through a private channel once your application has been reviewed.
      </PreviewNotice>
    </div>
  )
}

function ReviewStep({ form, errors, update, goTo }: StepProps & { goTo: (i: number) => void }) {
  const biz = form.applicantType === 'business'
  const cat = getCategory(form.category)
  const principalAmount = Number(form.amount)
  const financeCalculation = form.amount && Number.isSafeInteger(principalAmount) && principalAmount > 0
    ? calculateFinanceAmount(principalAmount * 100)
    : null
  const rows: { section: string; step: number; items: [string, string][] }[] = [
    { section: 'Application', step: 0, items: [['Applicant type', applicantTypes[form.applicantType ?? 'individual'].label], ['Finance category', cat?.name ?? '—']] },
    {
      section: biz ? 'Business' : 'Applicant', step: 1,
      items: biz
        ? [['Business name', form.businessName], ['Trading name', form.tradingName || '—'], ['Contact person', form.contactName], ['Email', form.email], ['Phone', form.phone]]
        : [['Name', `${form.firstName} ${form.lastName}`], ['Email', form.email], ['Phone', form.phone]],
    },
    {
      section: biz ? 'Registration' : 'Identity', step: 2,
      items: biz
        ? [['Entity type', form.entityType], ['Registration no.', form.registrationNumber], ['Directors', form.directors.filter((d) => d.name).map((d) => `${d.name} (${d.role})`).join(', ')]]
        : [['ID type', form.idType === 'sa-id' ? 'South African ID' : 'Passport'], ['ID number', form.idNumber ? `•••••••••${form.idNumber.slice(-4)}` : '—'], ['Date of birth', form.dateOfBirth]],
    },
    {
      section: biz ? 'Business finances' : 'Income', step: 3,
      items: biz
        ? [['Industry', form.industry], ['Years trading', form.yearsTrading], ['Annual turnover', form.annualTurnover ? formatZAR(Number(form.annualTurnover)) : '—']]
        : [['Employment', form.employmentStatus], ['Gross monthly', form.grossMonthlyIncome ? formatZAR(Number(form.grossMonthlyIncome)) : '—'], ['Net monthly', form.netMonthlyIncome ? formatZAR(Number(form.netMonthlyIncome)) : '—']],
    },
    {
      section: 'Finance requirement', step: 4,
      items: [
        ['Principal loan amount', form.amount ? formatZAR(principalAmount) : '—'],
        ['Documentation fee (1%)', financeCalculation ? formatZAR(financeCalculation.documentationFeeCents / 100) : '—'],
        ['VAT base (principal + documentation)', financeCalculation ? formatZAR(financeCalculation.vatBaseCents / 100) : '—'],
        ['VAT (15%)', financeCalculation ? formatZAR(financeCalculation.vatAmountCents / 100) : '—'],
        ['Total finance amount', financeCalculation ? formatZAR(financeCalculation.totalFinanceAmountCents / 100) : '—'],
        ['Term', `${form.term} months`],
        ['Deposit', form.deposit ? formatZAR(Number(form.deposit)) : 'None'],
        ['Requirement', form.assetDescription],
        ['Timing', form.timing],
        ['Referral code', form.referralCode || '—'],
      ],
    },
  ]
  const consents: { key: keyof ApplicationForm; label: string; required: boolean }[] = [
    { key: 'consentAccuracy', label: 'I confirm that the information in this application is true, complete and accurate.', required: true },
    { key: 'consentProcessing', label: 'I consent to Oxford Business Group processing my personal information to assess and arrange finance, as described in the Privacy Policy and POPIA notice.', required: true },
    { key: 'consentShareProviders', label: 'I consent to Oxford Business Group sharing this application with suitable finance providers for assessment.', required: true },
    { key: 'consentCreditCheck', label: 'I understand that finance providers may perform credit and fraud checks as part of their assessment.', required: true },
    { key: 'consentMarketing', label: 'Send me occasional updates about Oxford finance solutions (optional).', required: false },
  ]
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <section key={r.section} className="rounded-sm border border-border p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-sans text-xs font-semibold tracking-[0.2em] text-gold uppercase">{r.section}</h3>
              <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:text-gold hover:underline" onClick={() => goTo(r.step)}>Edit</button>
            </div>
            <dl className="space-y-1.5 text-sm">
              {r.items.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-2">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="break-words">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      <fieldset className="space-y-4">
        <legend className="mb-2 text-sm font-medium">Declarations and consent</legend>
        {consents.map((c) => (
          <div key={c.key}>
            <div className="flex items-start gap-3">
              <Checkbox id={c.key} checked={Boolean(form[c.key])} aria-invalid={Boolean(errors[c.key])}
                onCheckedChange={(v) => update(c.key, (v === true) as never)} className="mt-0.5" />
              <Label htmlFor={c.key} className="text-sm leading-relaxed font-normal text-foreground/85">
                {c.label}{c.required && <span className="text-gold"> *</span>}
              </Label>
            </div>
            {errors[c.key] && <p className="mt-1 ml-7 text-xs text-[oklch(0.75_0.15_27)]">{errors[c.key]}</p>}
          </div>
        ))}
      </fieldset>
      <p className="text-xs leading-relaxed text-muted-foreground">{intermediaryDisclaimer}</p>
    </div>
  )
}

function Confirmation({ reference, form }: { reference: string; form: ApplicationForm }) {
  const name = form.applicantType === 'business' ? form.businessName : form.firstName
  return (
    <div className="mx-auto max-w-2xl rounded-sm border border-gold/40 bg-card p-8 text-center sm:p-12">
      <CheckCircle2 className="mx-auto size-12 text-gold" aria-hidden="true" />
      <p className="eyebrow mt-6">Application received</p>
      <h2 className="mt-3 text-4xl font-medium">Thank you{name ? `, ${name}` : ''}.</h2>
      <p className="mt-4 text-muted-foreground">Your application reference is</p>
      <div className="mt-3 inline-flex items-center gap-3 rounded-sm border border-border bg-background px-5 py-3">
        <code className="font-mono text-lg tracking-wider text-gold">{reference}</code>
        <Button type="button" variant="ghost" size="icon-sm" aria-label="Copy reference"
          onClick={() => { void navigator.clipboard.writeText(reference); toast.success('Reference copied') }}>
          <Copy />
        </Button>
      </div>
      <PreviewNotice className="mt-8 text-left">
        Your application has been recorded for Oxford Business Group's review. This confirmation is not a credit
        approval, finance offer or guarantee of funding. Our office will contact you if further information or
        supporting documents are required.
      </PreviewNotice>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Button asChild variant="gold" className="rounded-sm"><Link to="/dashboard">Go to my dashboard</Link></Button>
        <Button asChild variant="outlineGold" className="rounded-sm"><Link to="/">Back to home</Link></Button>
      </div>
    </div>
  )
}
