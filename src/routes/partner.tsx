import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'
import { Copy, ExternalLink, Handshake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteLayout } from '@/components/site/SiteLayout'
import { PartnerReferralDocumentUpload } from '@/components/application/PartnerReferralDocumentUpload'
import { StatusBadge } from '@/components/site/StatusBadge'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { getPartnerWorkspaceData } from '@/lib/partner-actions'
import { getMySupportRequests } from '@/lib/support-actions'
import { formatDateTime } from '@/lib/format'

export const Route = createFileRoute('/partner')({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked) throw redirect({ to: '/login' })
    if (session.user.accountType !== 'partner' || !session.permissions.includes('partner_referrals.view')) {
      throw redirect({ to: '/partners' })
    }
  },
  loader: async () => {
    const [workspace, supportRequests] = await Promise.all([
      getPartnerWorkspaceData(),
      getMySupportRequests(),
    ])
    return { workspace, supportRequests }
  },
  head: () => ({ meta: [{ title: 'Partner portal | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: PartnerWorkspace,
})

function PartnerWorkspace() {
  const { workspace, supportRequests } = Route.useLoaderData()
  const [copyBusy, setCopyBusy] = useState(false)
  const referralUrl = workspace.referralUrl ?? ''

  const copyReferralLink = async () => {
    if (copyBusy) return
    setCopyBusy(true)
    try {
      if (!workspace.referralUrl) throw new Error('Referral access is not currently active.')
      await navigator.clipboard.writeText(workspace.referralUrl)
      toast.success('Your referral link has been copied.')
    } catch {
      toast.error('Could not copy the referral link. You can copy it from the field.')
    } finally {
      setCopyBusy(false)
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-14 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="eyebrow">Oxford partner portal</p>
            <h1 className="mt-3 text-4xl font-medium md:text-5xl">{workspace.partner.businessName}</h1>
            <p className="mt-3 text-sm text-muted-foreground">Welcome, {workspace.partner.contactName}. Review referral progress and manage your support requests.</p>
          </div>
          <div className="max-w-sm rounded-sm border border-border bg-card p-4 text-sm text-muted-foreground">New online applications are temporarily paused while Oxford verifies its secure application and document services.</div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Metric label="Referrals submitted" value={workspace.referrals.length} />
          <Metric label="Applications in progress" value={workspace.referrals.filter((item) => item.status !== 'Closed').length} />
          <Metric label="Support requests" value={supportRequests.length} />
        </section>

        {workspace.referralUrl ? (
        <section className="rounded-sm border border-gold/30 bg-card p-6 sm:p-8">
          <div className="flex items-center gap-3"><Handshake className="size-5 text-gold" /><h2 className="text-2xl">Your referral link</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">Your referral link remains assigned to your account. New online applications are temporarily paused; referral submissions will resume when the secure application service reopens.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input aria-label="Partner referral link" readOnly value={referralUrl} className="min-w-0 flex-1 rounded-sm border border-border bg-background px-3 py-3 text-sm text-foreground" />
            <Button type="button" variant="outlineGold" className="rounded-sm" onClick={() => void copyReferralLink()} disabled={copyBusy}><Copy className="mr-2 size-4" />Copy link</Button>
            <Button asChild variant="ghost" className="rounded-sm"><a href={referralUrl} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 size-4" />Open</a></Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Referral code: <span className="font-mono text-gold">{workspace.partner.referralCode}</span></p>
        </section>
        ) : (
        <section className="rounded-sm border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center gap-3"><Handshake className="size-5 text-gold" /><h2 className="text-2xl">Referral access</h2></div>
          <p className="mt-2 text-sm text-muted-foreground">Your partner status is currently {workspace.partner.status.toLowerCase()}. Referral links and customer referral reporting are unavailable until the Oxford office restores approved status. You can still review your existing referral records and support requests.</p>
        </section>
        )}

        <section className="rounded-sm border border-gold/30 bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h2 className="text-2xl">My confirmed payouts</h2><p className="mt-1 text-sm text-muted-foreground">View your own net payout amounts for confirmed funder settlements. Oxford's internal fee breakdown is not shown.</p></div>
            <Button asChild variant="outlineGold" className="rounded-sm"><Link to="/partner-payouts">View payouts</Link></Button>
          </div>
        </section>

        <section className="rounded-sm border border-border bg-card p-6">
          <h2 className="text-2xl">Customer referrals</h2>
          <p className="mt-1 text-sm text-muted-foreground">Only application references, categories and progress are shown here. Customer contact details and financial information remain private. If Super Admin enables supporting-document uploads for your account, you may upload files to your own referred applications; you cannot view or download the applicant's private documents.</p>
          {workspace.referrals.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">No applications have been submitted through your link yet.</p>
          ) : (
            <div className="mt-5 divide-y divide-border">
              {workspace.referrals.map((item) => (
                <div key={item.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-mono text-sm text-gold">{item.reference}</p><p className="mt-1 text-xs text-muted-foreground">{item.category} · {item.submittedAt ? formatDateTime(String(item.submittedAt)) : formatDateTime(String(item.referredAt))}</p></div>
                    <StatusBadge status={item.status} />
                  </div>
                  <PartnerReferralDocumentUpload
                    applicationId={item.applicationId}
                    applicantType={item.applicantType}
                    category={item.category}
                    canUploadSupportingDocuments={workspace.partner.canUploadSupportingDocuments}
                  />
                </div>
              ))}
            </div>
          )}
        </section>


        <section className="rounded-sm border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl">My support requests</h2>
            <Button asChild size="sm" variant="outlineGold" className="rounded-sm"><Link to="/support">Contact support</Link></Button>
          </div>
          {supportRequests.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">You have no support requests linked to this account.</p>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {supportRequests.map((request) => (
                <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium">{request.subject}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{request.channel} · {formatDateTime(String(request.createdAt))}</p>
                  </div>
                  <span className="rounded-sm border border-border px-2 py-0.5 text-xs text-muted-foreground">{request.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <p className="text-xs text-muted-foreground">Oxford Business Group is a finance intermediary, not a bank or lender. Finance decisions are made by finance providers. You may not access or download customers’ supporting documents through this portal.</p>
      </div>
    </SiteLayout>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-sm border border-border bg-card p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 font-display text-4xl text-gold">{value}</p></div>
}
