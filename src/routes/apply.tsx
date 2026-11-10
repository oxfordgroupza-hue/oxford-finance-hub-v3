import { createFileRoute } from '@tanstack/react-router'
import { PageHero } from '@/components/site/PageHero'
import { PreviewNotice } from '@/components/site/PreviewNotice'
import { SiteLayout } from '@/components/site/SiteLayout'
import { ApplicationWizard } from '@/components/application/ApplicationWizard'
import type { ApplicantType, FinanceCategoryId } from '@/lib/finance-config'

interface ApplySearch {
  type?: ApplicantType
  category?: FinanceCategoryId
  /** Partner referral code from a referral link — prefilled and locked in the wizard. */
  ref?: string
  draft?: string
  application?: string
}

const types = ['individual', 'business'] as const
const categories = ['vehicle', 'equipment', 'commercial-asset', 'other'] as const

function validateSearch(search: Record<string, unknown>): ApplySearch {
  const type = types.find((t) => t === search.type)
  const category = categories.find((c) => c === search.category)
  const rawRef = typeof search.ref === 'string' ? search.ref.trim().toUpperCase() : undefined
  const ref = rawRef && /^[A-Z0-9-]{3,40}$/.test(rawRef) ? rawRef : undefined
  const rawDraft = typeof search.draft === 'string' ? search.draft : undefined
  const draft = rawDraft && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawDraft) ? rawDraft : undefined
  const rawApplication = typeof search.application === 'string' ? search.application : undefined
  const application = rawApplication && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawApplication) ? rawApplication : undefined
  return { type, category, ref, draft, application }
}

export const Route = createFileRoute('/apply')({
  validateSearch,
  head: () => ({ meta: [{ title: 'Apply for finance | Oxford Finance Hub' }] }),
  component: ApplyPage,
})

function ApplyPage() {
  const { draft, application } = Route.useSearch()
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Finance application"
        title={<>Apply for <span className="text-gold-gradient italic">finance</span></>}
        intro="A guided finance application for individuals and businesses. Online submissions and document uploads will reopen after secure application and document services have been verified."
        image="hero.png"
      />
      <div className="mx-auto max-w-content px-4 py-14 sm:px-6">
        {application ? (
          <>
            <PreviewNotice className="mb-10">
              You are completing an application prepared by Oxford Business Group. Your changes update the original application record. Final submission remains restricted to this Deploy Preview while security verification is completed.
            </PreviewNotice>
            <ApplicationWizard initialApplicationId={application} />
          </>
        ) : draft ? (
          <>
            <PreviewNotice className="mb-10">
              You are resuming a saved draft in this Deploy Preview. Draft changes are restricted to the preview environment; final submission and document uploads remain disabled until Oxford completes security verification.
            </PreviewNotice>
            <ApplicationWizard initialDraftId={draft} />
          </>
        ) : (
        <>
        <PreviewNotice className="mb-10">
          Online applications and document uploads are temporarily unavailable while Oxford verifies its secure
          application, account-access and private document services. Do not enter or submit real personal, identity,
          banking or financial information until Oxford confirms that the application service is open.
        </PreviewNotice>
        <div className="rounded-sm border border-border bg-card p-8 sm:p-10" role="status" aria-live="polite">
          <p className="eyebrow">Applications temporarily paused</p>
          <h2 className="mt-3 text-2xl font-medium">Secure application services are being prepared.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            The application form is currently disabled. No application or document can be submitted through this page.
            Please return after Oxford Business Group announces that online applications have reopened.
          </p>
        </div>
        </>
        )}
      </div>
    </SiteLayout>
  )
}
