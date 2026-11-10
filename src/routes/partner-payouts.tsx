import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { getMyPartnerPayouts } from '@/lib/settlement-actions'
import { formatDateTime, formatZAR } from '@/lib/format'
import { WorkspaceSignOutButton } from '@/components/site/WorkspaceSignOutButton'

export const Route = createFileRoute('/partner-payouts')({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked ||
        session.user.accountType !== 'partner' || !session.permissions.includes('own_payouts.view')) {
      throw redirect({ to: '/login' })
    }
  },
  loader: () => getMyPartnerPayouts(),
  head: () => ({ meta: [{ title: 'My payouts | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: PartnerPayouts,
})

function PartnerPayouts() {
  const { expected, confirmed, termsPendingApproval } = Route.useLoaderData()
  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="eyebrow">Oxford partner portal</p><h1 className="mt-2 text-4xl">My confirmed payouts</h1><p className="mt-3 max-w-2xl text-sm text-muted-foreground">This page shows only your own confirmed net payout amounts. It does not show Oxford's internal fee breakdown and does not initiate a payment.</p></div>
          <WorkspaceSignOutButton />
        </header>
        <section className="rounded-sm border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl">Expected net payouts</h2>
          <p className="mt-1 text-sm text-muted-foreground">Estimates based on the approved finance amount and current fee terms. The final amount may change if the actual funder settlement differs.</p>
          {termsPendingApproval ? (
            <p className="mt-4 rounded-sm border border-border bg-background p-4 text-sm text-muted-foreground">Oxford is finalising its partner payout and administration fee terms. Expected payout estimates will appear here once those terms have been formally approved.</p>
          ) : expected.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">There are no approved applications awaiting funder settlement.</p> : (
            <div className="mt-4 divide-y divide-border">
              {expected.map((item) => <div key={item.applicationReference} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div><p className="font-mono text-sm text-gold">{item.applicationReference}</p><p className="mt-1 text-xs text-muted-foreground">Provider approval recorded {formatDateTime(String(item.approvedAt))} · Estimate</p></div>
                <div className="text-right"><p className="text-xs uppercase tracking-wider text-muted-foreground">Expected net payout</p><p className="mt-1 text-xl font-semibold text-gold">{formatZAR(item.expectedNetPayableCents / 100)}</p></div>
              </div>)}
            </div>
          )}
        </section>
        <section className="rounded-sm border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl">Confirmed net payouts</h2>
          <p className="mt-1 text-sm text-muted-foreground">Amounts calculated from the actual funder settlement received and recorded by Oxford. No payment is initiated by this page.</p>
          {confirmed.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">No confirmed settlements are available for your partner account yet.</p> : (
            <div className="mt-4 divide-y divide-border">
              {confirmed.map((item) => <div key={item.settlementReference} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div><p className="font-mono text-sm text-gold">{item.settlementReference}</p><p className="mt-1 text-xs text-muted-foreground">Application {item.applicationReference} · received {formatDateTime(String(item.settledAt))}</p></div>
                <div className="text-right"><p className="text-xs uppercase tracking-wider text-muted-foreground">Confirmed net payout</p><p className="mt-1 text-xl font-semibold text-gold">{formatZAR(item.partnerNetPayableCents / 100)}</p></div>
              </div>)}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
