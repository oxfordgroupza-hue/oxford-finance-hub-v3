import { Link } from '@tanstack/react-router'
import { downloadMyApplicationPack } from '@/lib/pdf-pack-actions'
import { toast } from 'sonner'
import { DocumentUploadPanel } from '@/components/application/DocumentUploadPanel'
import { Download, FilePen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { StatusBadge } from '@/components/site/StatusBadge'
import { applicantTypes, applicationStatuses, getCategory } from '@/lib/finance-config'
import { formatDate, formatDateTime, formatZAR } from '@/lib/format'
import { calculateFinanceAmount } from '@/lib/fee-calculation'
import { cn } from '@/lib/utils'

const trackedStages = applicationStatuses.filter((status) => status !== 'Draft' && status !== 'Closed')

type CustomerApplication = {
  id: string; reference: string; applicantType: 'individual' | 'business'
  category: 'vehicle' | 'equipment' | 'commercial-asset' | 'other'
  status: (typeof applicationStatuses)[number]; financeAmount: number | null
  assetDescription: string | null; submittedAt: Date | string | null; updatedAt: Date | string
  isOfficeIntakeDraft?: boolean
  statusHistory: Array<{ fromStatus: string | null; toStatus: string; createdAt: Date | string }>
}
type CustomerDraft = {
  id: string; applicantType: 'individual' | 'business'
  category: 'vehicle' | 'equipment' | 'commercial-asset' | 'other'
  updatedAt: Date | string; stepIndex: number
}
type CustomerSupportRequest = { id: string; channel: string; status: string; subject: string; createdAt: Date | string; updatedAt: Date | string }

export function CustomerDashboard({ applications, drafts, supportRequests }: { applications: CustomerApplication[]; drafts: CustomerDraft[]; supportRequests: CustomerSupportRequest[] }) {
  return (
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">My dashboard</p>
          <h1 className="mt-3 text-4xl font-medium md:text-5xl">Your finance applications.</h1>
        </div>
        <div className="max-w-sm rounded-sm border border-border bg-card p-4 text-sm text-muted-foreground">New online applications are temporarily paused while Oxford verifies its secure application and document services.</div>
      </div>

      <section aria-labelledby="apps-h" className="space-y-4">
        <h2 id="apps-h" className="text-2xl">Applications</h2>
        {applications.length === 0 ? (
          <div className="rounded-sm border border-border bg-card p-8">
            <p className="text-lg">No applications yet</p>
            <p className="mt-2 text-sm text-muted-foreground">Online applications are temporarily paused. When the secure service reopens, your application reference and progress will appear here.</p>
          </div>
        ) : applications.map((application) => {
          const stage = trackedStages.indexOf(application.status as (typeof trackedStages)[number])
          const financeCalculation = application.financeAmount && application.financeAmount > 0
            ? calculateFinanceAmount(application.financeAmount * 100)
            : null
          return (
            <article key={application.id} className="rounded-sm border border-border bg-card p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="font-mono text-xs text-gold">{application.reference}</p>
                  <h3 className="mt-1 text-2xl">{getCategory(application.category)?.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {applicantTypes[application.applicantType].label} · Principal requested: {formatZAR(application.financeAmount ?? 0)} · submitted {application.submittedAt ? formatDate(String(application.submittedAt)) : 'pending'}
                  </p>
                  {financeCalculation && <p className="mt-1 text-sm text-muted-foreground">Total finance amount including 1% documentation fee and 15% VAT: {formatZAR(financeCalculation.totalFinanceAmountCents / 100)}</p>}
                  {application.assetDescription && <p className="mt-2 text-sm text-muted-foreground">{application.assetDescription}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={application.status} />
                  {application.status === 'Draft' && application.isOfficeIntakeDraft && (
                    <Button asChild size="sm" variant="outlineGold" className="rounded-sm">
                      <Link to="/apply" search={{ application: application.id }}>Complete application</Link>
                    </Button>
                  )}
                </div>
              </div>
              <ol className="mt-8 grid grid-cols-5 gap-2" aria-label="Application progress">
                {trackedStages.map((status, index) => (
                  <li key={status} className="space-y-2">
                    <div className={cn('h-1 rounded-full', index <= stage ? 'bg-gold' : 'bg-muted')} />
                    <p className={cn('hidden text-[0.7rem] sm:block', index === stage ? 'text-gold' : 'text-muted-foreground')}>{status}</p>
                  </li>
                ))}
              </ol>
              {application.statusHistory.length > 0 && (
                <div className="mt-6 border-t border-border pt-4">
                  <h4 className="text-sm font-medium">Status history</h4>
                  <ol className="mt-3 space-y-2">
                    {application.statusHistory.map((entry, index) => (
                      <li key={`${entry.toStatus}-${String(entry.createdAt)}-${index}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span>{entry.toStatus}</span>
                        <time className="text-xs text-muted-foreground">{formatDateTime(String(entry.createdAt))}</time>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outlineGold"
                  className="rounded-sm"
                  onClick={async () => {
                    try {
                      const pack = await downloadMyApplicationPack({ data: { applicationId: application.id } })
                      window.location.assign(pack.url)
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Your application pack is not available yet.')
                    }
                  }}
                >
                  <Download className="mr-2 size-4" /> Download application pack
                </Button>
              </div>
              <DocumentUploadPanel applicationId={application.id} applicantType={application.applicantType} category={application.category} />
            </article>
          )
        })}
      </section>

      <section aria-labelledby="drafts-h" className="rounded-sm border border-border bg-card p-6">
        <h2 id="drafts-h" className="flex items-center gap-2 text-2xl"><FilePen className="size-5 text-gold" /> Saved drafts</h2>
        {drafts.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Online application and draft saving services are temporarily paused. Existing application records remain available in this dashboard.</p> : (
          <>
          <ul className="mt-5 space-y-4">
            {drafts.map((draft) => (
              <li key={draft.id} className="rounded-sm border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{applicantTypes[draft.applicantType].label} · {getCategory(draft.category)?.name}</p>
                    <p className="text-xs text-muted-foreground">Saved {formatDateTime(String(draft.updatedAt))}</p>
                  </div>
                  <Button asChild size="sm" variant="outlineGold" className="rounded-sm"><Link to="/apply" search={{ draft: draft.id }}>Resume draft</Link></Button>
                </div>
                <Progress value={Math.round(((draft.stepIndex + 1) / 7) * 100)} className="mt-3 h-1" />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">Drafts are encrypted in your Oxford account. You can resume and save changes in this Deploy Preview; final submission remains paused.</p>
          </>
        )}
      </section>

      <section aria-labelledby="support-h" className="rounded-sm border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="support-h" className="text-2xl">My support requests</h2>
          <Button asChild size="sm" variant="outlineGold" className="rounded-sm"><Link to="/support">Contact support</Link></Button>
        </div>
        {supportRequests.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">You have no support requests linked to this account.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {supportRequests.map((request) => (
              <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{request.subject}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{request.channel} · received {formatDateTime(String(request.createdAt))}</p>
                </div>
                <span className="rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground">{request.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-sm border border-border bg-card p-6">
        <h2 className="text-2xl">Office updates</h2>
        <p className="mt-2 text-sm text-muted-foreground">Messages from the Oxford team will appear here when the live notification workflow is activated.</p>
      </section>
    </div>
  )
}
