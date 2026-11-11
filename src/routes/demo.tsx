import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { ArrowLeft, CheckCircle2, CircleUserRound, FlaskConical, ShieldCheck } from 'lucide-react'
import { demoActors, demoEnvironment, demoPartnerSummary, demoSupportRequests, demoTimeline, getDemoVisibleApplications, getDemoVisibleEvents, type DemoRole, type DemoTimelineEvent } from '@/lib/demo-scenarios'

export const Route = createFileRoute('/demo')({
  beforeLoad: () => {
    if (process.env.CONTEXT !== 'deploy-preview') throw redirect({ to: '/' })
  },
  head: () => ({ meta: [{ title: 'Role-play demo | Oxford Finance Hub' }, { name: 'robots', content: 'noindex,nofollow' }] }),
  component: DemoWorkspace,
})

const roleOrder: DemoRole[] = [
  'Super Administrator', 'Administrator', 'Office staff', 'Application reviewer',
  'Customer support', 'Customer', 'Partner',
]

function DemoWorkspace() {
  const [role, setRole] = useState<DemoRole>('Super Administrator')
  const [events, setEvents] = useState<DemoTimelineEvent[]>(demoTimeline)
  const [completed, setCompleted] = useState<string[]>([])
  const actor = demoActors.find((item) => item.role === role)!
  const visibleApplications = useMemo(() => getDemoVisibleApplications(role, actor.id), [actor.id, role])
  const visibleEvents = useMemo(() => getDemoVisibleEvents(role, actor.id, events), [actor.id, events, role])

  const simulateAction = (action: string, index: number) => {
    const key = actor.id + ':' + index
    if (completed.includes(key)) return
    setCompleted((current) => [...current, key])
    setEvents((current) => [{
      id: 'local-' + key,
      actorId: actor.id,
      occurredAt: new Date().toISOString(),
      action,
      record: role === 'Customer support' ? 'SUP-DEMO-004' : 'OBG-DEMO-2026-001',
      outcome: 'Simulated locally in this preview; no database record, email, WhatsApp or provider submission was created.',
      visibleTo: [role],
    }, ...current])
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <header className="border-b border-white/10 bg-[#101010]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#c7a45a]">Oxford Business Group</p>
            <h1 className="mt-1 font-serif text-2xl">Role-play demonstration</h1>
          </div>
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-white/65 hover:text-[#e5cc91]"><ArrowLeft className="size-4" /> Administration</Link>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-7 px-5 py-8">
        <div className="rounded-lg border border-[#c7a45a]/35 bg-[#17150f] p-5">
          <div className="flex items-center gap-2 text-[#e5cc91]"><FlaskConical className="size-4" /><span className="text-xs font-semibold tracking-widest">{demoEnvironment.label}</span></div>
          <p className="mt-2 text-sm leading-6 text-white/70">Choose a role to see its day-to-day work and the records it is allowed to see. Buttons below simulate actions in your browser only. These are not login accounts and do not change real application data.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/55">
            <span className="rounded border border-white/10 px-2 py-1">Email disabled</span>
            <span className="rounded border border-white/10 px-2 py-1">WhatsApp disabled</span>
            <span className="rounded border border-white/10 px-2 py-1">Provider submissions disabled</span>
            <span className="rounded border border-white/10 px-2 py-1">Production writes disabled</span>
          </div>
        </div>

        <section>
          <h2 className="mb-3 font-serif text-2xl">Select a role</h2>
          <div className="flex flex-wrap gap-2">
            {roleOrder.map((item) => <button key={item} type="button" onClick={() => setRole(item)} aria-pressed={role === item}
              className={`rounded border px-3 py-2 text-sm transition ${role === item ? 'border-[#c7a45a] bg-[#c7a45a]/15 text-[#f0d99e]' : 'border-white/15 bg-white/[0.03] text-white/65 hover:border-[#c7a45a]/60'}`}>{item}</button>)}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
          <article className="rounded-lg border border-white/10 bg-[#121212] p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-md border border-[#c7a45a]/30 bg-[#c7a45a]/10 p-3 text-[#e5cc91]"><CircleUserRound className="size-6" /></div>
              <div><p className="text-xs uppercase tracking-widest text-[#c7a45a]">{actor.role}</p><h2 className="mt-1 font-serif text-3xl">{actor.name}</h2><p className="mt-1 text-sm text-white/50">{actor.email}</p>{actor.organisation && <p className="mt-1 text-sm text-white/60">{actor.organisation}</p>}</div>
            </div>
            <p className="mt-5 text-sm leading-6 text-white/70">{actor.description}</p>
            <h3 className="mt-6 text-sm font-semibold text-[#e5cc91]">Actions this person performs</h3>
            <div className="mt-3 space-y-2">
              {actor.actions.map((action, index) => {
                const key = actor.id + ':' + index
                const done = completed.includes(key)
                return <div key={key} className="flex items-center justify-between gap-3 rounded border border-white/10 bg-black/20 p-3">
                  <span className="text-sm text-white/75">{action}</span>
                  <button type="button" disabled={done} onClick={() => simulateAction(action, index)} className="shrink-0 rounded border border-[#c7a45a]/40 px-3 py-1.5 text-xs text-[#e5cc91] disabled:opacity-50">{done ? 'Simulated' : 'Simulate'}</button>
                </div>
              })}
            </div>
          </article>

          <aside className="space-y-4">
            <div className="rounded-lg border border-white/10 bg-[#121212] p-5">
              <div className="flex items-center gap-2"><ShieldCheck className="size-4 text-[#c7a45a]" /><h3 className="font-semibold">Access boundary</h3></div>
              <p className="mt-3 text-sm leading-6 text-white/65">{role === 'Partner' ? 'This partner sees only referrals linked to its own partner account. Applicant identity, bank statements and private supporting documents remain hidden.' : role === 'Customer' ? 'This customer sees only their own applications, messages and document checklist.' : role === 'Customer support' ? 'Support can respond to queries and coordinate with the office, but cannot open restricted applicant financial documents.' : 'Office roles see records according to their assigned permissions. Super Administrator controls role assignments and sensitive partner permissions.'}</p>
            </div>
            {role === 'Partner' && <div className="rounded-lg border border-white/10 bg-[#121212] p-5"><h3 className="font-semibold">Partner performance</h3><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><Metric label="Referrals" value={demoPartnerSummary.referrals} /><Metric label="Submitted" value={demoPartnerSummary.applicationsSubmitted} /><Metric label="Expected payout" value={'R' + demoPartnerSummary.expectedPayoutZar.toLocaleString('en-ZA')} /></div><p className="mt-3 text-xs text-white/45">Partner view does not disclose Oxford's fee breakdown.</p></div>}
            {(role === 'Customer support' || role === 'Administrator' || role === 'Super Administrator') && <div className="rounded-lg border border-white/10 bg-[#121212] p-5"><h3 className="font-semibold">Support inbox sample</h3>{demoSupportRequests.map((request) => <div key={request.reference} className="mt-3 border-t border-white/10 pt-3"><p className="font-mono text-xs text-[#e5cc91]">{request.reference}</p><p className="mt-1 text-sm">{request.subject}</p><p className="mt-1 text-xs text-white/45">{request.status}</p></div>)}</div>}
          </aside>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#121212] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">Applications visible to {role.toLowerCase()}</h2><p className="mt-1 text-xs text-white/45">Fictional records only · amounts shown in ZAR</p>{role === 'Customer support' && <p className="mt-2 text-xs text-white/55">Customer support sees assigned support tickets only. Application records, assessments and private financial information are not available in this role.</p>}</div><span className="text-sm text-[#e5cc91]">{visibleApplications.length} records</span></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleApplications.map((app) => <article key={app.reference} className="rounded border border-white/10 bg-black/20 p-4">
              <p className="font-mono text-xs text-[#e5cc91]">{app.reference}</p><h3 className="mt-2 font-semibold">{app.asset}</h3>
              <p className="mt-1 text-sm text-white/55">{app.applicantType} · {app.category}</p>
              <p className="mt-3 font-serif text-2xl">R{app.amountZar.toLocaleString('en-ZA')}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs"><span className="rounded border border-white/15 px-2 py-1">{app.status}</span><span className="rounded border border-white/15 px-2 py-1">{app.priority} priority</span></div>
              {(role === 'Application reviewer' || role === 'Administrator' || role === 'Super Administrator') && <div className="mt-3 border-t border-white/10 pt-3"><p className="text-xs text-[#e5cc91]">Internal assessment: {app.assessment.score}/100 · {app.assessment.outcome}</p><p className="mt-1 text-xs text-white/50">Credit bureau used: No · Verified reversals (3 months): {app.assessment.reversalCountLastThreeMonths}</p></div>}
              {role === 'Customer' && <p className="mt-3 text-xs text-white/55">Outstanding: {app.outstandingDocuments.length ? app.outstandingDocuments.join(', ') : 'None in this demo record'}</p>}
              {role === 'Partner' && <p className="mt-3 text-xs text-white/45">Referral progress only. Private applicant documents are not available.</p>}
            </article>)}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#121212] p-5">
          <h2 className="font-serif text-2xl">Activity history</h2>
          <div className="mt-4 space-y-3">{visibleEvents.slice(0, 12).map((event) => {
            const eventActor = demoActors.find((item) => item.id === event.actorId)
            return <div key={event.id} className="flex gap-3 border-l border-[#c7a45a]/40 pl-4">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#c7a45a]" />
              <div className="min-w-0"><p className="text-sm">{event.action}</p><p className="mt-1 text-xs text-white/45">{eventActor?.name ?? 'Demo actor'} · {event.record} · {new Date(event.occurredAt).toLocaleString('en-ZA')}</p><p className="mt-1 text-xs leading-5 text-white/55">{event.outcome}</p></div>
            </div>
          })}</div>
        </section>
        <p className="text-center text-xs text-white/35">Role-play only. Simulated actions reset when this page is refreshed.</p>
      </main>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded border border-white/10 bg-black/20 p-3"><p className="text-xs text-white/45">{label}</p><p className="mt-1 font-serif text-xl text-[#e5cc91]">{value}</p></div>
}
