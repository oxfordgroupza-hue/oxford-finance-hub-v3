import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import {
  Activity, ArrowLeft, Bot, ClipboardList, FileText, Gauge, Handshake, Inbox, LayoutGrid, ListOrdered, Lock, Search,
  Send, ShieldAlert, Sparkles, UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { BrandLogo } from '@/components/site/BrandLogo'
import { PreviewNotice } from '@/components/site/PreviewNotice'
import { PriorityBadge, StatusBadge } from '@/components/site/StatusBadge'
import { applicantTypes, applicationStatuses, financeCategories, getCategory, type ApplicationStatus } from '@/lib/finance-config'
import {
  applications as seedApplications, partners as seedPartners, readinessChecks, staff, supportRequests,
  type FinanceApplication, type OfficeRole, type PartnerRecord,
} from '@/lib/fixtures'
import { formatDate, formatDateTime, formatZAR } from '@/lib/format'
import { cn } from '@/lib/utils'

type View = 'overview' | 'register' | 'queue' | 'partners' | 'support' | 'readiness'

const nav: { id: View; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'register', label: 'Application register', icon: ClipboardList },
  { id: 'queue', label: 'Priority queue', icon: ListOrdered },
  { id: 'partners', label: 'Partners', icon: Handshake },
  { id: 'support', label: 'Support inbox', icon: Inbox },
  { id: 'readiness', label: 'Automation readiness', icon: Gauge },
]

/** Preview of the role model that Milestone 3 enforces server-side. */
const permissions: Record<OfficeRole, { viewDocuments: boolean; changeStatus: boolean; assign: boolean; managePartners: boolean }> = {
  Administrator: { viewDocuments: true, changeStatus: true, assign: true, managePartners: true },
  'Application reviewer': { viewDocuments: true, changeStatus: true, assign: false, managePartners: false },
  'Office staff': { viewDocuments: true, changeStatus: true, assign: true, managePartners: false },
  'Customer support': { viewDocuments: false, changeStatus: false, assign: false, managePartners: false },
}

export function OfficeWorkspace() {
  const [view, setView] = useState<View>('overview')
  const [role, setRole] = useState<OfficeRole>('Administrator')
  const [apps, setApps] = useState<FinanceApplication[]>(seedApplications)
  const [partnerList, setPartnerList] = useState<PartnerRecord[]>(seedPartners)
  const [openRef, setOpenRef] = useState<string | null>(null)
  const actor = staff.find((s) => s.role === role)!.name
  const can = permissions[role]
  const open = apps.find((a) => a.reference === openRef) ?? null

  const patchApp = (ref: string, patch: Partial<FinanceApplication>, action?: string) =>
    setApps((list) =>
      list.map((a) =>
        a.reference !== ref
          ? a
          : {
              ...a,
              ...patch,
              updatedAt: new Date().toISOString(),
              activity: action
                ? [...a.activity, { id: crypto.randomUUID(), at: new Date().toISOString(), actor, action, kind: 'staff' as const }]
                : a.activity,
            },
      ),
    )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="border-b border-sidebar-border p-5"><BrandLogo /></div>
        <p className="eyebrow px-5 pt-6 pb-2 text-[0.6rem]">Office workspace</p>
        <nav aria-label="Office" className="flex-1 space-y-0.5 px-3">
          {nav.map((n) => (
            <button key={n.id} type="button" onClick={() => setView(n.id)}
              className={cn('flex w-full items-center gap-3 rounded-sm px-3 py-2 text-sm transition-colors',
                view === n.id ? 'bg-sidebar-accent text-gold' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60')}>
              <n.icon className="size-4" aria-hidden="true" /> {n.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <Link to="/" className="flex items-center gap-2 text-xs text-muted-foreground hover:text-gold"><ArrowLeft className="size-3.5" /> Public website</Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3 md:hidden"><BrandLogo /></div>
          <Select value={view} onValueChange={(v) => setView(v as View)}>
            <SelectTrigger className="w-52 md:hidden" aria-label="Office section"><SelectValue /></SelectTrigger>
            <SelectContent>{nav.map((n) => <SelectItem key={n.id} value={n.id}>{n.label}</SelectItem>)}</SelectContent>
          </Select>
          <h1 className="hidden font-display text-2xl md:block">{nav.find((n) => n.id === view)!.label}</h1>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">Previewing as</span>
            <Select value={role} onValueChange={(v) => setRole(v as OfficeRole)}>
              <SelectTrigger className="w-48" aria-label="Preview role"><UserCheck className="size-4 text-gold" /><SelectValue /></SelectTrigger>
              <SelectContent>{Object.keys(permissions).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </header>

        <main className="flex-1 space-y-6 p-4 sm:p-6">
          <PreviewNotice>
            Office preview with fictional sample records. Sign-in, server-side role enforcement and live application data
            arrive in the next milestones — changes made here are not saved.
          </PreviewNotice>
          {view === 'overview' && <Overview apps={apps} onOpen={setOpenRef} goTo={setView} />}
          {view === 'register' && <Register apps={apps} onOpen={setOpenRef} />}
          {view === 'queue' && <Queue apps={apps} onOpen={setOpenRef} />}
          {view === 'partners' && (
            <Partners list={partnerList} canManage={can.managePartners}
              onApprove={(id) => {
                setPartnerList((l) => l.map((p) => (p.id === id ? { ...p, status: 'Approved', referralCode: p.referralCode ?? `PARTNER-${id.toUpperCase()}-NEW` } : p)))
                toast.success('Partner approved', { description: 'A referral code has been issued.' })
              }} />
          )}
          {view === 'support' && <Support />}
          {view === 'readiness' && <Readiness />}
        </main>
      </div>

      <CaseSheet app={open} onClose={() => setOpenRef(null)} can={can} actor={actor} patchApp={patchApp} />
    </div>
  )
}

/* ---------------------------------------------------------------- */

function Kpi({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-sm border border-border bg-card p-5">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-2 font-display text-4xl text-foreground">{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  )
}

function Overview({ apps, onOpen, goTo }: { apps: FinanceApplication[]; onOpen: (r: string) => void; goTo: (v: View) => void }) {
  const open = apps.filter((a) => a.status !== 'Closed')
  const unassigned = apps.filter((a) => !a.assignedTo)
  const awaiting = apps.filter((a) => a.status === 'Awaiting documents')
  const pipeline = open.reduce((s, a) => s + a.amount, 0)
  const byCategory = financeCategories.map((c) => ({ c, n: apps.filter((a) => a.category === c.id).length }))
  const max = Math.max(...byCategory.map((b) => b.n), 1)
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Open applications" value={open.length} />
        <Kpi label="Unassigned" value={unassigned.length} note="Need an owner" />
        <Kpi label="Awaiting documents" value={awaiting.length} />
        <Kpi label="Pipeline value" value={formatZAR(pipeline).replace('R', 'R ')} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-sm border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="text-xl">Needs attention</h2>
            <Button variant="ghost" size="sm" className="text-gold" onClick={() => goTo('queue')}>Priority queue</Button>
          </div>
          <ul className="divide-y divide-border">
            {[...apps].sort((a, b) => b.score - a.score).slice(0, 4).map((a) => (
              <li key={a.reference}>
                <button type="button" onClick={() => onOpen(a.reference)} className="flex w-full items-center gap-4 p-4 text-left hover:bg-accent/40">
                  <ScoreRing score={a.score} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.applicantName}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.reference} · {getCategory(a.category)?.name}</p>
                  </div>
                  <StatusBadge status={a.status} className="hidden sm:inline-flex" />
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-sm border border-border bg-card p-5">
          <h2 className="text-xl">Applications by category</h2>
          <ul className="mt-5 space-y-4">
            {byCategory.map(({ c, n }) => (
              <li key={c.id}>
                <div className="mb-1.5 flex justify-between text-sm"><span>{c.name}</span><span className="text-muted-foreground tabular-nums">{n}</span></div>
                <div className="h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-gold" style={{ width: `${(n / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

function ScoreRing({ score }: { score: number }) {
  const tone = score >= 75 ? 'text-gold' : score >= 55 ? 'text-warning' : 'text-muted-foreground'
  return (
    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-current text-xs font-semibold tabular-nums', tone)} aria-label={`Enquiry score ${score}`}>
      {score}
    </span>
  )
}

function Register({ apps, onOpen }: { apps: FinanceApplication[]; onOpen: (r: string) => void }) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [type, setType] = useState('all')
  const rows = useMemo(
    () =>
      apps.filter((a) =>
        (status === 'all' || a.status === status) &&
        (category === 'all' || a.category === category) &&
        (type === 'all' || a.applicantType === type) &&
        (!q || `${a.applicantName} ${a.reference}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [apps, q, status, category, type],
  )
  return (
    <section className="rounded-sm border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input placeholder="Search by applicant or reference" aria-label="Search applications" className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="lg:w-48" aria-label="Filter by status"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All statuses</SelectItem>{applicationStatuses.filter((s) => s !== 'Draft').map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="lg:w-52" aria-label="Filter by category"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All categories</SelectItem>{financeCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="lg:w-40" aria-label="Filter by applicant type"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All applicants</SelectItem><SelectItem value="individual">Individual</SelectItem><SelectItem value="business">Business</SelectItem></SelectContent>
        </Select>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead><TableHead>Applicant</TableHead><TableHead>Category</TableHead>
            <TableHead className="text-right">Amount</TableHead><TableHead>Priority</TableHead><TableHead>Status</TableHead>
            <TableHead>Assigned</TableHead><TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.reference} className="cursor-pointer" onClick={() => onOpen(a.reference)}>
              <TableCell><button type="button" className="font-mono text-xs text-gold hover:underline" onClick={() => onOpen(a.reference)}>{a.reference}</button></TableCell>
              <TableCell><span className="block text-sm">{a.applicantName}</span><span className="text-xs text-muted-foreground">{applicantTypes[a.applicantType].label}</span></TableCell>
              <TableCell className="text-sm">{getCategory(a.category)?.name}</TableCell>
              <TableCell className="text-right text-sm tabular-nums">{formatZAR(a.amount)}</TableCell>
              <TableCell><PriorityBadge priority={a.priority} /></TableCell>
              <TableCell><StatusBadge status={a.status} /></TableCell>
              <TableCell className="text-sm text-muted-foreground">{a.assignedTo ?? <span className="text-warning">Unassigned</span>}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDate(a.submittedAt)}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow><TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">No applications match these filters.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </section>
  )
}

function Queue({ apps, onOpen }: { apps: FinanceApplication[]; onOpen: (r: string) => void }) {
  const lanes = (['High', 'Medium', 'Low'] as const).map((p) => ({ p, items: apps.filter((a) => a.priority === p && a.status !== 'Closed').sort((a, b) => b.score - a.score) }))
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Enquiry scores rank completeness and readiness signals to help the office decide what to look at first. Scores never approve or decline an application — every decision stays with a person and the finance provider.</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {lanes.map(({ p, items }) => (
          <section key={p} className="rounded-sm border border-border bg-card">
            <header className="flex items-center justify-between border-b border-border p-4"><PriorityBadge priority={p} /><span className="text-xs text-muted-foreground">{items.length}</span></header>
            <ul className="space-y-3 p-3">
              {items.map((a) => (
                <li key={a.reference}>
                  <button type="button" onClick={() => onOpen(a.reference)} className="w-full rounded-sm border border-border bg-background p-4 text-left transition-colors hover:border-gold/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{a.applicantName}</p><p className="font-mono text-[0.7rem] text-muted-foreground">{a.reference}</p></div>
                      <ScoreRing score={a.score} />
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {a.scoreSignals.slice(0, 3).map((s) => <li key={s} className="rounded-sm bg-muted px-2 py-0.5 text-[0.7rem] text-muted-foreground">{s}</li>)}
                    </ul>
                  </button>
                </li>
              ))}
              {items.length === 0 && <li className="p-4 text-center text-xs text-muted-foreground">Nothing in this lane.</li>}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}

function Partners({ list, canManage, onApprove }: { list: PartnerRecord[]; canManage: boolean; onApprove: (id: string) => void }) {
  return (
    <section className="rounded-sm border border-border bg-card">
      <Table>
        <TableHeader><TableRow><TableHead>Organisation</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Referral code</TableHead><TableHead className="text-right">Referrals</TableHead><TableHead className="text-right">Submitted</TableHead><TableHead /></TableRow></TableHeader>
        <TableBody>
          {list.map((p) => (
            <TableRow key={p.id}>
              <TableCell><span className="block text-sm">{p.organisation}</span><span className="text-xs text-muted-foreground">{p.contact} · since {formatDate(p.joinedAt)}</span></TableCell>
              <TableCell className="text-sm">{p.type}</TableCell>
              <TableCell><span className={cn('text-xs', p.status === 'Approved' ? 'text-success' : 'text-warning')}>{p.status}</span></TableCell>
              <TableCell className="font-mono text-xs text-gold">{p.referralCode ?? '—'}</TableCell>
              <TableCell className="text-right tabular-nums">{p.referrals}</TableCell>
              <TableCell className="text-right tabular-nums">{p.submitted}</TableCell>
              <TableCell className="text-right">
                {p.status === 'Pending approval' && (
                  canManage
                    ? <Button size="sm" variant="outlineGold" className="rounded-sm" onClick={() => onApprove(p.id)}>Approve</Button>
                    : <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> Admin only</span>
                )}
                {p.referralCode && (
                  <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/apply?ref=${p.referralCode}`); toast.success('Referral link copied') }}>Copy link</Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

function Support() {
  return (
    <section className="rounded-sm border border-border bg-card">
      <ul className="divide-y divide-border">
        {supportRequests.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              {r.channel === 'Complaint' ? <ShieldAlert className="mt-0.5 size-4 text-[oklch(0.75_0.15_27)]" /> : <Inbox className="mt-0.5 size-4 text-gold" />}
              <div><p className="text-sm font-medium">{r.subject}</p><p className="text-xs text-muted-foreground">{r.from} · {r.channel} · {formatDateTime(r.receivedAt)}</p></div>
            </div>
            <span className={cn('text-xs', r.status === 'Open' ? 'text-gold' : r.status === 'Resolved' ? 'text-success' : 'text-muted-foreground')}>{r.status}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Readiness() {
  return (
    <section className="rounded-sm border border-border bg-card">
      <ul className="divide-y divide-border">
        {readinessChecks.map((c) => (
          <li key={c.area} className="flex flex-col gap-1 p-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm">{c.area}</span>
            <span className="text-xs text-warning">{c.state}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------------------------------------------------------------- */

function CaseSheet({
  app, onClose, can, actor, patchApp,
}: {
  app: FinanceApplication | null
  onClose: () => void
  can: (typeof permissions)[OfficeRole]
  actor: string
  patchApp: (ref: string, patch: Partial<FinanceApplication>, action?: string) => void
}) {
  const [note, setNote] = useState('')
  const [assistantQ, setAssistantQ] = useState('')
  return (
    <Sheet open={Boolean(app)} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto border-border bg-background sm:max-w-2xl">
        {app && (
          <>
            <SheetHeader className="border-b border-border pb-5">
              <p className="font-mono text-xs text-gold">{app.reference}</p>
              <SheetTitle className="font-display text-3xl font-medium">{app.applicantName}</SheetTitle>
              <SheetDescription>
                {applicantTypes[app.applicantType].label} · {getCategory(app.category)?.name} · {formatZAR(app.amount)} over {app.term} months
              </SheetDescription>
              <div className="flex flex-wrap gap-2 pt-2"><StatusBadge status={app.status} /><PriorityBadge priority={app.priority} /></div>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-10">
              {/* Processing panel */}
              <section className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Select value={app.status} disabled={!can.changeStatus}
                    onValueChange={(v) => { patchApp(app.reference, { status: v as ApplicationStatus }, `Status changed to ${v}`); toast.success(`Status updated to ${v}`) }}>
                    <SelectTrigger className="w-full" aria-label="Application status"><SelectValue /></SelectTrigger>
                    <SelectContent>{applicationStatuses.filter((s) => s !== 'Draft').map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Assigned to</p>
                  <Select value={app.assignedTo ?? ''} disabled={!can.assign}
                    onValueChange={(v) => { patchApp(app.reference, { assignedTo: v }, `Assigned to ${v}`); toast.success(`Assigned to ${v}`) }}>
                    <SelectTrigger className="w-full" aria-label="Assigned to"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>{staff.filter((s) => s.role !== 'Customer support').map((s) => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {(!can.changeStatus || !can.assign) && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground sm:col-span-2"><Lock className="size-3" /> Some actions are not available to your role.</p>
                )}
              </section>

              {/* Automatic summary */}
              <section className="rounded-sm border border-gold/30 bg-gold/[0.05] p-5">
                <h3 className="flex items-center gap-2 font-sans text-xs font-semibold tracking-[0.2em] text-gold uppercase"><Sparkles className="size-3.5" /> Automatic summary</h3>
                <p className="mt-3 text-sm leading-relaxed">{app.summary}</p>
                <div className="mt-4 flex items-center gap-3"><ScoreRing score={app.score} /><ul className="flex flex-wrap gap-1.5">{app.scoreSignals.map((s) => <li key={s} className="rounded-sm bg-background px-2 py-0.5 text-[0.7rem] text-muted-foreground">{s}</li>)}</ul></div>
                <p className="mt-4 text-[0.7rem] text-muted-foreground">Assistive only. Summaries and scores never approve or decline finance.</p>
              </section>

              {/* Details */}
              <section>
                <h3 className="mb-3 font-sans text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Application details</h3>
                <dl className="grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
                  <dt className="text-muted-foreground">Requirement</dt><dd>{app.assetDescription}</dd>
                  <dt className="text-muted-foreground">Contact</dt><dd>{app.contactEmail}<br />{app.contactPhone}</dd>
                  <dt className="text-muted-foreground">Referral</dt><dd className="font-mono text-xs">{app.referralCode ?? 'Direct'}</dd>
                  <dt className="text-muted-foreground">Submitted</dt><dd>{formatDateTime(app.submittedAt)}</dd>
                </dl>
              </section>

              {/* Documents */}
              <section>
                <h3 className="mb-3 font-sans text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Documents & application pack</h3>
                {can.viewDocuments ? (
                  <ul className="divide-y divide-border rounded-sm border border-border">
                    {app.documents.map((d) => (
                      <li key={d.id} className="flex items-center justify-between p-3 text-sm">
                        <span className="flex items-center gap-2"><FileText className="size-4 text-gold" />{d.label}</span>
                        <span className={cn('text-xs', d.status === 'Verified' ? 'text-success' : d.status === 'Received' ? 'text-info' : 'text-warning')}>{d.status}</span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between p-3 text-sm">
                      <span className="flex items-center gap-2"><FileText className="size-4 text-gold" />{app.reference}.pdf</span>
                      <span className="text-xs text-muted-foreground">PDF pack — Milestone 6</span>
                    </li>
                  </ul>
                ) : (
                  <p className="flex items-center gap-2 rounded-sm border border-border p-4 text-sm text-muted-foreground"><Lock className="size-4" /> Your role cannot view applicant documents.</p>
                )}
              </section>

              {/* Notes */}
              <section>
                <h3 className="mb-3 font-sans text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">Internal notes</h3>
                <ul className="space-y-3">
                  {app.notes.map((n) => (
                    <li key={n.id} className="rounded-sm border border-border bg-card p-3 text-sm">
                      <p>{n.body}</p><p className="mt-1.5 text-xs text-muted-foreground">{n.author} · {formatDateTime(n.at)}</p>
                    </li>
                  ))}
                  {app.notes.length === 0 && <li className="text-sm text-muted-foreground">No notes yet.</li>}
                </ul>
                <form className="mt-3 space-y-2" onSubmit={(e) => {
                  e.preventDefault()
                  if (!note.trim()) return
                  patchApp(app.reference, { notes: [...app.notes, { id: crypto.randomUUID(), author: actor, at: new Date().toISOString(), body: note.trim() }] }, 'Added an internal note')
                  setNote('')
                }}>
                  <Textarea rows={2} placeholder="Add an internal note (never visible to the customer)" aria-label="Internal note" value={note} onChange={(e) => setNote(e.target.value)} />
                  <Button type="submit" size="sm" variant="outlineGold" className="rounded-sm" disabled={!note.trim()}>Add note</Button>
                </form>
              </section>

              {/* Office assistant */}
              <section className="rounded-sm border border-border p-4">
                <h3 className="flex items-center gap-2 font-sans text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase"><Bot className="size-3.5" /> Office assistant</h3>
                <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); toast('Office assistant arrives in Milestone 8', { description: 'It will draft summaries and customer updates for staff to review.' }); setAssistantQ('') }}>
                  <Input placeholder="e.g. Draft a document request for this applicant" aria-label="Ask the office assistant" value={assistantQ} onChange={(e) => setAssistantQ(e.target.value)} />
                  <Button type="submit" size="icon" aria-label="Ask"><Send /></Button>
                </form>
              </section>

              {/* Activity */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 font-sans text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase"><Activity className="size-3.5" /> Activity log</h3>
                <ol className="relative space-y-4 border-l border-border pl-5">
                  {[...app.activity].reverse().map((ev) => (
                    <li key={ev.id} className="relative">
                      <span className={cn('absolute top-1.5 -left-[1.42rem] size-2 rounded-full', ev.kind === 'automation' ? 'bg-info' : ev.kind === 'customer' ? 'bg-success' : 'bg-gold')} />
                      <p className="text-sm">{ev.action}</p>
                      <p className="text-xs text-muted-foreground">{ev.actor} · {formatDateTime(ev.at)}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
