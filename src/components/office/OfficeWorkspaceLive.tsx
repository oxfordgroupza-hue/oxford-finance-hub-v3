import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { Activity, BarChart3, Bell, ClipboardList, Download, Handshake, Inbox, LayoutDashboard, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/site/StatusBadge'
import { applicationStatuses } from '@/lib/domain'
import { formatDateTime, formatZAR } from '@/lib/format'
import {
  assignApplication,
  createOfficeNote,
  updateApplicationStatus,
  updateSupportRequestStatus,
} from '@/lib/office-actions'
import { downloadApplicationPack as getApplicationPackDownload, generateApplicationPack } from '@/lib/pdf-pack-actions'
import { decidePartnerRegistration } from '@/lib/partner-actions'
import { linkMerchantPartnerToApplication } from '@/lib/partner-link-actions'
import { getNotificationQueue, processNotificationQueue } from '@/lib/notification-actions'
import { WorkspaceSignOutButton } from '@/components/site/WorkspaceSignOutButton'
import { calculateFinanceAmount } from '@/lib/fee-calculation'
import { backfillDirectoryIdentityIndex, searchRestrictedDirectory } from '@/lib/directory-actions'

type OfficeData = {
  applications: Array<{
    id: string; reference: string; applicantType: 'individual' | 'business'; category: string
    status: (typeof applicationStatuses)[number]; priority: string; financeAmount: number | null
    assetDescription: string | null; referralCode: string | null; partnerBusinessName: string | null; submittedAt: Date | null; createdAt: Date
    firstName: string | null; lastName: string | null; businessName: string | null
    phone: string | null; email: string | null
  }>
  partners: Array<{ id: string; businessName: string; contactName: string; email: string; phone: string | null; linkedUserId: string | null; status: string; referralCode: string | null; createdAt: Date }>
  support: Array<{ id: string; channel: string; status: string; name: string; email: string; subject: string; message: string; createdAt: Date }>
  audit: Array<{ id: string; actorUserId: string | null; actorName: string | null; actorEmail: string | null; event: string; resource: string; resourceId: string | null; details: string; createdAt: Date }>
  securityAudit: Array<{ id: string; actorUserId: string | null; actorName: string | null; actorEmail: string | null; affectedUserId: string | null; action: string; resource: string; recordId: string | null; previousValue: string | null; newValue: string | null; reason: string | null; createdAt: Date }>
  staff: Array<{ id: string; name: string | null; email: string }>
  notes: Array<{ id: string; applicationId: string; body: string; authorUserId: string | null; createdAt: Date }>
  assignments: Array<{ applicationId: string; assignedTo: string; assignedAt: Date; completedAt: Date | null; name: string | null; email: string }>
  history: Array<{ id: string; applicationId: string; fromStatus: string | null; toStatus: string; changedBy: string | null; note: string | null; createdAt: Date }>
  permissions: string[]
  isSuperAdmin: boolean
  administratorEmail: string
}

type View = 'overview' | 'applications' | 'partners' | 'support' | 'directory' | 'notifications' | 'audit' | 'reports'

export function OfficeWorkspaceLive({ data }: { data: OfficeData }) {
  const router = useRouter()
  const [view, setView] = useState<View>('overview')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [providerDecision, setProviderDecision] = useState<'approved' | 'declined' | 'withdrawn' | ''>('')
  const [busy, setBusy] = useState(false)
  const [packBusy, setPackBusy] = useState(false)
  const [partnerBusyId, setPartnerBusyId] = useState<string | null>(null)
  const [partnerToLink, setPartnerToLink] = useState('')
  const [notificationRows, setNotificationRows] = useState<Array<{ id: string; channel: string; template: string; status: string; attempts: number; lastError: string | null; createdAt: Date; sentAt: Date | null }>>([])
  const [notificationProviderConfigured, setNotificationProviderConfigured] = useState(false)
  const [notificationDeliveryEnabled, setNotificationDeliveryEnabled] = useState(false)
  const [notificationBusy, setNotificationBusy] = useState(false)
  const [directoryQuery, setDirectoryQuery] = useState('')
  const [directoryBusy, setDirectoryBusy] = useState(false)
  const [directoryResults, setDirectoryResults] = useState<Array<{ id: string; group: string; name: string; email: string; phone: string; reference: string; status: string; identityNumber: string }>>([])
  const [directorySearched, setDirectorySearched] = useState(false)
  const [directoryBackfillBusy, setDirectoryBackfillBusy] = useState(false)
  const selected = data.applications.find((application) => application.id === selectedId) ?? null
  const selectedFinanceCalculation = selected?.financeAmount && selected.financeAmount > 0
    ? calculateFinanceAmount(selected.financeAmount * 100)
    : null
  const can = (permission: string) => data.isSuperAdmin || data.permissions.includes(permission)

  const refresh = async () => { await router.invalidate() }
  const runDirectoryBackfill = async () => {
    if (directoryBackfillBusy) return
    setDirectoryBackfillBusy(true)
    let afterId: string | undefined
    let scanned = 0
    let indexed = 0
    try {
      for (let batch = 0; batch < 100; batch += 1) {
        const result = await backfillDirectoryIdentityIndex({ data: { afterId } })
        scanned += result.scanned
        indexed += result.indexed
        if (!result.hasMore || !result.nextCursor) break
        afterId = result.nextCursor
      }
      toast.success(`Identity search index checked ${scanned} applications; ${indexed} records indexed.`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The identity search index could not be rebuilt.')
    } finally {
      setDirectoryBackfillBusy(false)
    }
  }

  const runDirectorySearch = async () => {
    const query = directoryQuery.trim()
    if (query.length < 2 || directoryBusy) return
    setDirectoryBusy(true)
    setDirectorySearched(false)
    try {
      const result = await searchRestrictedDirectory({ data: { query } })
      setDirectoryResults(result.entries)
      setDirectorySearched(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The directory search could not be completed.')
    } finally {
      setDirectoryBusy(false)
    }
  }
  const loadNotifications = async () => {
    try {
      const result = await getNotificationQueue()
      setNotificationRows(result.notifications)
      setNotificationProviderConfigured(result.providerConfigured)
      setNotificationDeliveryEnabled(result.deliveryEnabled)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load the notification queue.')
    }
  }
  const runNotificationQueue = async () => {
    if (notificationBusy) return
    setNotificationBusy(true)
    try {
      const result = await processNotificationQueue()
      toast.success(`Notification queue processed: ${result.sent} sent, ${result.failed} failed.`)
      await loadNotifications()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Notification delivery could not be started.')
    } finally {
      setNotificationBusy(false)
    }
  }
  const decidePartner = async (registrationId: string, status: 'Approved' | 'Declined' | 'Suspended') => {
    if (partnerBusyId) return
    setPartnerBusyId(registrationId)
    try {
      const result = await decidePartnerRegistration({ data: { registrationId, status } })
      toast.success(status === 'Approved' ? `Partner approved. Referral code: ${result.referralCode}` : `Partner status updated: ${status}.`)
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Partner registration could not be updated.')
    } finally {
      setPartnerBusyId(null)
    }
  }

  const linkPartner = async (partnerRegistrationId: string) => {
    if (!selected || !partnerRegistrationId || busy) return
    setBusy(true)
    try {
      const result = await linkMerchantPartnerToApplication({ data: { applicationId: selected.id, partnerRegistrationId } })
      toast.success(result.alreadyLinked ? 'This merchant partner is already registered on the application.' : 'Merchant referral registered. The partner has been notified without receiving access to private documents.')
      setPartnerToLink('')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The merchant partner could not be linked.')
    } finally {
      setBusy(false)
    }
  }

  const downloadApplicationPack = async () => {
    if (!selected || packBusy) return
    setPackBusy(true)
    try {
      await generateApplicationPack({ data: { applicationId: selected.id } })
      const pack = await getApplicationPackDownload({ data: { applicationId: selected.id } })
      window.location.assign(pack.url)
      toast.success('A secure, temporary application-pack download has been prepared.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The application pack could not be generated.')
    } finally {
      setPackBusy(false)
    }
  }
  const saveStatus = async (status: (typeof applicationStatuses)[number]) => {
    if (!selected || status === selected.status) return
    if (status === 'Provider decision received' && (!can('applications.approve') || !providerDecision)) {
      toast.error('A staff member with provider-decision permission must select and record the provider outcome.')
      return
    }
    setBusy(true)
    try {
      await updateApplicationStatus({ data: {
        applicationId: selected.id,
        status,
        note: statusNote.trim() || undefined,
        providerDecision: status === 'Provider decision received' ? providerDecision as 'approved' | 'declined' | 'withdrawn' : undefined,
      } })
      setStatusNote('')
      toast.success('Application status updated.')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The status could not be updated.')
    } finally { setBusy(false) }
  }
  const saveNote = async () => {
    if (!selected || !note.trim()) return
    setBusy(true)
    try {
      await createOfficeNote({ data: { applicationId: selected.id, body: note.trim() } })
      setNote('')
      toast.success('Internal note saved.')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The note could not be saved.')
    } finally { setBusy(false) }
  }
  const assign = async (assignedTo: string) => {
    if (!selected || !assignedTo) return
    setBusy(true)
    try {
      await assignApplication({ data: { applicationId: selected.id, assignedTo } })
      toast.success('Application assigned.')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The application could not be assigned.')
    } finally { setBusy(false) }
  }

  const exportReport = () => {
    if (!can('reports.export')) return
    const rows = [
      ['Application reference', 'Applicant type', 'Category', 'Status', 'Principal loan amount (ZAR)', 'Submitted'],
      ...data.applications.map((application) => [
        application.reference,
        application.applicantType,
        application.category,
        application.status,
        application.financeAmount ?? '',
        application.submittedAt ? application.submittedAt.toISOString() : '',
      ]),
    ]
    const csv = rows.map((row) => row.map((value) => {
      const safe = String(value ?? '').replace(/"/g, '""')
      return `"${safe}"`
    }).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `oxford-finance-report-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const nav: { id: View; label: string; icon: typeof LayoutDashboard; permission: string }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, permission: 'office.view' },
    { id: 'applications', label: 'Applications', icon: ClipboardList, permission: 'applications.view' },
    { id: 'partners', label: 'Partners', icon: Handshake, permission: 'partners.view' },
    { id: 'support', label: 'Support inbox', icon: Inbox, permission: 'support.view' },
    { id: 'directory', label: 'People directory', icon: Search, permission: 'directory.view' },
    { id: 'notifications', label: 'Notifications', icon: Bell, permission: 'notifications.view' },
    { id: 'audit', label: 'Audit trail', icon: ShieldCheck, permission: 'audit_log.view' },
    { id: 'reports', label: 'Reports', icon: BarChart3, permission: 'reports.view' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card px-5 py-5 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow">Oxford Business Group</p>
            <h1 className="mt-1 font-display text-3xl">Office operations</h1>
            <p className="mt-1 text-xs text-muted-foreground">Signed in as {data.administratorEmail}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {can('applications.create') && <Button asChild variant="outlineGold"><a href="/office/intakes">New applicant intake</a></Button>}
            {can('credit_assessments.view') && <Button asChild variant="outlineGold"><a href="/office/credit-assessments">Credit assessment review</a></Button>}
            {(can('products.view') || can('content.view')) && <Button asChild variant="outlineGold"><a href="/office/catalogue">Finance products & site content</a></Button>}
            <Button variant="outlineGold" onClick={() => void refresh()}><RefreshCw className="size-4" /> Refresh records</Button>
            <WorkspaceSignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[15rem_1fr] sm:px-8">
        <aside>
          <nav aria-label="Office operations" className="flex flex-wrap gap-2 lg:flex-col">
            {nav.filter((item) => can(item.permission)).map((item) => {
              const Icon = item.icon
              return <button key={item.id} type="button" onClick={() => { setView(item.id); if (item.id === 'notifications') void loadNotifications() }}
                className={`flex items-center gap-3 rounded-sm px-4 py-3 text-left text-sm ${view === item.id ? 'bg-gold/10 text-gold' : 'bg-card text-muted-foreground hover:text-foreground'}`}>
                <Icon className="size-4" /> {item.label}
              </button>
            })}
          </nav>
          <p className="mt-6 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            Live office records. Sensitive identity and financial fields remain encrypted and are not shown in this register.
          </p>
        </aside>

        <main className="min-w-0 space-y-6">
          {view === 'overview' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Applications" value={data.applications.length} />
                <Metric label="Open applications" value={data.applications.filter((a) => a.status !== 'Closed').length} />
                <Metric label="Partner registrations" value={data.partners.length} />
                <Metric label="Open support requests" value={data.support.filter((r) => r.status !== 'Resolved').length} />
              </div>
              <section className="rounded-sm border border-border bg-card p-6">
                <h2 className="text-xl">Recent applications</h2>
                <div className="mt-4 divide-y divide-border">
                  {data.applications.slice(0, 8).map((application) => (
                    <button key={application.id} type="button" onClick={() => { setSelectedId(application.id); setView('applications') }}
                      className="flex w-full flex-wrap items-center justify-between gap-3 py-3 text-left hover:text-gold">
                      <span><span className="block font-mono text-xs text-gold">{application.reference}</span><span className="mt-1 block text-sm">{applicantName(application)}</span></span>
                      <span className="flex items-center gap-3"><StatusBadge status={application.status} /><span className="text-xs text-muted-foreground">Principal {formatZAR(application.financeAmount ?? 0)}</span></span>
                    </button>
                  ))}
                  {data.applications.length === 0 && <p className="py-5 text-sm text-muted-foreground">No live applications have been submitted.</p>}
                </div>
              </section>
            </>
          )}

          {view === 'applications' && (
            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)]">
              <div className="rounded-sm border border-border bg-card p-5">
                <h2 className="text-xl">Application register</h2>
                <div className="mt-4 divide-y divide-border">
                  {data.applications.map((application) => (
                    <button key={application.id} type="button" onClick={() => setSelectedId(application.id)}
                      className={`w-full rounded-sm py-4 text-left ${selectedId === application.id ? 'bg-gold/5' : ''}`}>
                      <span className="flex items-start justify-between gap-3"><span><span className="block font-mono text-xs text-gold">{application.reference}</span><span className="mt-1 block text-sm font-medium">{applicantName(application)}</span></span><StatusBadge status={application.status} /></span>
                      <span className="mt-2 block text-xs text-muted-foreground">{application.category} · Principal {formatZAR(application.financeAmount ?? 0)}</span>
                    </button>
                  ))}
                  {data.applications.length === 0 && <p className="py-6 text-sm text-muted-foreground">No live applications to display.</p>}
                </div>
              </div>
              <div className="rounded-sm border border-border bg-card p-5">
                {selected ? (
                  <div className="space-y-5">
                    <div><p className="font-mono text-xs text-gold">{selected.reference}</p><h2 className="mt-1 text-2xl">{applicantName(selected)}</h2>{(selected.email || selected.phone) && <p className="mt-1 text-sm text-muted-foreground">{selected.email}{selected.email && selected.phone ? " · " : ""}{selected.phone}</p>}</div>
                    <div className="grid grid-cols-2 gap-3 text-sm"><Detail label="Applicant" value={selected.applicantType} /><Detail label="Category" value={selected.category} /><Detail label="Principal loan amount" value={formatZAR(selected.financeAmount ?? 0)} /><Detail label="Documentation fee (1%)" value={selectedFinanceCalculation ? formatZAR(selectedFinanceCalculation.documentationFeeCents / 100) : '—'} /><Detail label="VAT base" value={selectedFinanceCalculation ? formatZAR(selectedFinanceCalculation.vatBaseCents / 100) : '—'} /><Detail label="VAT (15%)" value={selectedFinanceCalculation ? formatZAR(selectedFinanceCalculation.vatAmountCents / 100) : '—'} /><Detail label="Total finance amount" value={selectedFinanceCalculation ? formatZAR(selectedFinanceCalculation.totalFinanceAmountCents / 100) : '—'} /><Detail label="Submitted" value={selected.submittedAt ? formatDateTime(String(selected.submittedAt)) : '—'} /></div>
                    <Detail label="Requirement" value={selected.assetDescription ?? '—'} />
                    {selected.partnerBusinessName
                      ? <Detail label="Referring merchant partner" value={selected.partnerBusinessName} />
                      : selected.referralCode
                        ? <Detail label="Referral code on record" value={selected.referralCode} />
                        : can('applications.edit') && can('partners.view') && (
                          <div className="space-y-2 border-t border-border pt-4">
                            <label className="block text-xs text-muted-foreground">Register referring merchant partner (optional)</label>
                            <Select value={partnerToLink} onValueChange={(id) => { setPartnerToLink(id); void linkPartner(id) }} disabled={busy}>
                              <SelectTrigger><SelectValue placeholder="Choose an approved merchant partner" /></SelectTrigger>
                              <SelectContent>
                                {data.partners.filter((partner) => partner.status === 'Approved' && partner.linkedUserId && partner.referralCode).map((partner) => (
                                  <SelectItem key={partner.id} value={partner.id}>{partner.businessName}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">The partner receives a referral-registration notice only. Applicant details and private documents remain restricted to the applicant and authorised Oxford staff.</p>
                          </div>
                        )}
                    {can('pdf_packs.create') && can('pdf_packs.download') && (
                      <Button type="button" variant="outlineGold" className="w-full rounded-sm" onClick={() => void downloadApplicationPack()} disabled={packBusy}>
                        <Download className="mr-2 size-4" />{packBusy ? 'Generating pack…' : 'Generate & download application PDF'}
                      </Button>
                    )}
                    {data.assignments.find((assignment) => assignment.applicationId === selected.id) && (
                      <Detail label="Assigned to" value={data.assignments.find((assignment) => assignment.applicationId === selected.id)?.name || data.assignments.find((assignment) => assignment.applicationId === selected.id)?.email || 'Office staff'} />
                    )}
                    {can('applications.view') && (
                      <div className="border-t border-border pt-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Status history</p>
                        <ol className="mt-3 space-y-3">
                          {data.history.filter((entry) => entry.applicationId === selected.id).map((entry) => (
                            <li key={entry.id} className="border-l-2 border-gold/50 pl-3">
                              <p className="text-sm">{entry.toStatus}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(String(entry.createdAt))}{entry.note ? ` · ${entry.note}` : ''}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {can('notes.view') && (
                      <div className="border-t border-border pt-4">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">Internal notes</p>
                        <ul className="mt-3 space-y-3">
                          {data.notes.filter((entry) => entry.applicationId === selected.id).map((entry) => (
                            <li key={entry.id} className="rounded border border-border bg-background p-3 text-sm">
                              <p>{entry.body}</p><p className="mt-2 text-xs text-muted-foreground">{formatDateTime(String(entry.createdAt))}</p>
                            </li>
                          ))}
                          {data.notes.every((entry) => entry.applicationId !== selected.id) && <li className="text-xs text-muted-foreground">No internal notes yet.</li>}
                        </ul>
                      </div>
                    )}
                    {can('applications.edit') && (
                      <div className="space-y-3 border-t border-border pt-4">
                        <label className="block text-xs text-muted-foreground">Update application status</label>
                        <Textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="Optional reason or update note" rows={2} />
                        {can('applications.approve') && (
                          <Select value={providerDecision} onValueChange={(value) => setProviderDecision(value as typeof providerDecision)}>
                            <SelectTrigger><SelectValue placeholder="Select provider decision when applicable" /></SelectTrigger>
                            <SelectContent><SelectItem value="approved">Provider approved</SelectItem><SelectItem value="declined">Provider declined</SelectItem><SelectItem value="withdrawn">Withdrawn</SelectItem></SelectContent>
                          </Select>
                        )}
                        <Select value={selected.status} onValueChange={(status) => void saveStatus(status as (typeof applicationStatuses)[number])} disabled={busy}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{applicationStatuses.filter((status) => status !== 'Draft' && (status !== 'Provider decision received' || can('applications.approve')) && (status !== 'Closed' || can('applications.approve'))).map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    {can('applications.assign') && data.staff.length > 0 && (
                      <div className="space-y-2 border-t border-border pt-4">
                        <label className="block text-xs text-muted-foreground">Assign to office staff</label>
                        <Select onValueChange={(id) => void assign(id)} disabled={busy}>
                          <SelectTrigger><SelectValue placeholder="Choose staff member" /></SelectTrigger>
                          <SelectContent>{data.staff.map((person) => <SelectItem key={person.id} value={person.id}>{person.name || person.email}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    )}
                    {can('notes.create') && (
                      <div className="space-y-2 border-t border-border pt-4">
                        <label className="block text-xs text-muted-foreground">Internal note</label>
                        <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Visible to authorised office staff only" rows={3} />
                        <Button onClick={() => void saveNote()} disabled={busy || !note.trim()}>Save internal note</Button>
                      </div>
                    )}
                  </div>
                ) : <p className="py-12 text-sm text-muted-foreground">Select an application to review its details and permitted actions.</p>}
              </div>
            </section>
          )}

          {view === 'partners' && (
            <section className="rounded-sm border border-border bg-card p-5">
              <h2 className="text-xl">Partner registrations</h2>
              <div className="mt-4 divide-y divide-border">
                {data.partners.map((partner) => <div key={partner.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                  <div><p className="font-medium">{partner.businessName}</p><p className="mt-1 text-xs text-muted-foreground">{partner.contactName} · {partner.email}</p><p className="mt-1 text-xs text-muted-foreground">Referral code: {partner.referralCode || 'Not issued'}</p></div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">{partner.status}</span>
                    {can('partners.approve') && partner.status === 'Pending approval' && partnerBusyId !== partner.id && (
                      partner.linkedUserId
                        ? <><Button size="sm" variant="gold" className="rounded-sm" onClick={() => void decidePartner(partner.id, 'Approved')}>Approve & issue link</Button><Button size="sm" variant="outlineGold" className="rounded-sm" onClick={() => void decidePartner(partner.id, 'Declined')}>Decline</Button></>
                        : <span className="max-w-56 text-right text-xs text-muted-foreground">Applicant must sign in and submit registration again to link their account.</span>
                    )}
                    {partnerBusyId === partner.id && <span className="text-xs text-muted-foreground">Updating…</span>}
                    {can('partners.approve') && partner.status === 'Approved' && <Button size="sm" variant="outlineGold" className="rounded-sm" onClick={() => void decidePartner(partner.id, 'Suspended')} disabled={Boolean(partnerBusyId)}>Suspend</Button>}
                    {can('partners.approve') && partner.status === 'Suspended' && <Button size="sm" variant="gold" className="rounded-sm" onClick={() => void decidePartner(partner.id, 'Approved')} disabled={Boolean(partnerBusyId)}>Reinstate</Button>}
                  </div>
                </div>)}
                {data.partners.length === 0 && <p className="py-5 text-sm text-muted-foreground">No partner registrations have been received.</p>}
              </div>
            </section>
          )}

          {view === 'support' && (
            <section className="rounded-sm border border-border bg-card p-5">
              <h2 className="text-xl">Support inbox</h2>
              <div className="mt-4 divide-y divide-border">
                {data.support.map((request) => <article key={request.id} className="py-4">
                  <div className="flex flex-wrap justify-between gap-3"><div><p className="font-medium">{request.subject}</p><p className="mt-1 text-xs text-muted-foreground">{request.name} · {request.email} · {request.channel}</p></div><span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">{request.status}</span></div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{request.message}</p>
                  {can('support.edit') && <Select value={request.status} onValueChange={async (status) => {
                    try { await updateSupportRequestStatus({ data: { requestId: request.id, status: status as 'Open' | 'Awaiting customer' | 'Resolved' } }); toast.success('Support request updated.'); await refresh() }
                    catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update support request.') }
                  }}><SelectTrigger className="mt-3 max-w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Open">Open</SelectItem><SelectItem value="Awaiting customer">Awaiting customer</SelectItem><SelectItem value="Resolved">Resolved</SelectItem></SelectContent></Select>}
                </article>)}
                {data.support.length === 0 && <p className="py-5 text-sm text-muted-foreground">No support requests have been received.</p>}
              </div>
            </section>
          )}

          {view === 'directory' && (
            <section className="rounded-sm border border-border bg-card p-5">
              <div>
                <h2 className="text-xl">Restricted people directory</h2>
                <p className="mt-1 text-sm text-muted-foreground">Find applicants, customers, people who contacted Support, partners and Oxford staff. Search by name, email, phone or application reference. For an exact ID/passport lookup, prefix the number with ID: or PASSPORT:.</p>
                <p className="mt-2 text-xs text-muted-foreground">This is a contact lookup only. Financial information, credit assessments and private documents are never displayed. ID/passport numbers are masked unless your role has separate sensitive-identity permission.</p>
              </div>
              <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void runDirectorySearch() }}>
                <input value={directoryQuery} onChange={(event) => setDirectoryQuery(event.target.value)} maxLength={100} minLength={2} placeholder="Name, email, phone, reference or ID: number" className="min-w-0 flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm outline-none focus:border-gold" />
                <Button type="submit" variant="gold" className="rounded-sm" disabled={directoryBusy || directoryQuery.trim().length < 2}><Search className="mr-2 size-4" />{directoryBusy ? 'Searching…' : 'Search directory'}</Button>
              </form>
              {data.isSuperAdmin && <div className="mt-4 flex flex-wrap items-center gap-3"><Button type="button" variant="outline" className="rounded-sm" disabled={directoryBackfillBusy} onClick={() => void runDirectoryBackfill()}>{directoryBackfillBusy ? 'Indexing...' : 'Backfill existing ID/passport searches'}</Button><span className="text-xs text-muted-foreground">Super Administrator only. Existing encrypted applications are processed in small batches.</span></div>}
              <div className="mt-5 divide-y divide-border">
                {directoryResults.map((entry) => (
                  <article key={entry.id} className="py-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div><p className="font-medium">{entry.name}</p><p className="mt-1 text-xs text-muted-foreground">{entry.group}</p></div>
                      <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">{entry.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{entry.email}{entry.phone ? ` · ${entry.phone}` : ''}</p>
                    {entry.reference && <p className="mt-1 text-xs text-muted-foreground">{entry.group === 'Applicant / customer' ? 'Application / account reference' : 'Related detail'}: {entry.reference}</p>}
                    {entry.identityNumber && <p className="mt-1 text-xs text-muted-foreground">ID / passport: <span className="font-mono">{entry.identityNumber}</span></p>}
                  </article>
                ))}
                {directorySearched && directoryResults.length === 0 && <p className="py-5 text-sm text-muted-foreground">No matching records were found.</p>}
                {!directorySearched && directoryResults.length === 0 && <p className="py-5 text-sm text-muted-foreground">Enter a search term and select Search directory. Results are limited to contact and account information.</p>}
              </div>
            </section>
          )}

          {view === 'notifications' && (
            <section className="rounded-sm border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-xl">Transactional notifications</h2><p className="mt-1 text-xs text-muted-foreground">Delivery history and queued messages. Application PDFs are never attached to email.</p></div>
                {can('notifications.manage') && <Button type="button" variant="gold" className="rounded-sm" onClick={() => void runNotificationQueue()} disabled={notificationBusy || !notificationProviderConfigured || !notificationDeliveryEnabled}>{notificationBusy ? 'Processing…' : 'Process queued emails'}</Button>}
              </div>
              {!notificationProviderConfigured && <p className="mt-4 rounded-sm border border-warning/30 bg-warning/5 p-3 text-sm text-muted-foreground">Brevo is not connected to the application runtime. Add the transactional API key, verified sender and office notification address in Netlify before delivery can be enabled.</p>}
              {notificationProviderConfigured && !notificationDeliveryEnabled && <p className="mt-4 rounded-sm border border-border p-3 text-sm text-muted-foreground">Provider credentials are present, but email delivery remains disabled until the sender and preview test have been verified.</p>}
              <div className="mt-4 divide-y divide-border">
                {notificationRows.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div><p className="text-sm font-medium">{item.template.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-muted-foreground">{item.channel} · queued {formatDateTime(String(item.createdAt))}{item.sentAt ? ` · sent ${formatDateTime(String(item.sentAt))}` : ''}</p>{item.lastError && <p className="mt-1 text-xs text-destructive">{item.lastError}</p>}</div>
                  <span className="rounded-sm border border-border px-2 py-1 text-xs text-muted-foreground">{item.status} · {item.attempts} attempts</span>
                </div>)}
                {notificationRows.length === 0 && <p className="py-5 text-sm text-muted-foreground">No notification records are queued or recorded yet.</p>}
              </div>
            </section>
          )}

          {view === 'reports' && (
            <section className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="text-xl">Application reporting</h2><p className="mt-1 text-xs text-muted-foreground">Reports use only the applications your account is authorised to view.</p></div>
                {can('reports.export') && <Button type="button" variant="outlineGold" className="rounded-sm" onClick={exportReport}><Download className="mr-2 size-4" />Export CSV</Button>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <Metric label="Applications in this view" value={data.applications.length} />
                <Metric label="Open applications" value={data.applications.filter((a) => a.status !== 'Closed').length} />
                <div className="rounded-sm border border-border bg-card p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">Total requested principal</p><p className="mt-2 font-display text-3xl text-gold">{formatZAR(data.applications.reduce((sum, a) => sum + (a.financeAmount ?? 0), 0))}</p></div>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-sm border border-border bg-card p-5">
                  <h3 className="text-lg">Applications by status</h3>
                  <div className="mt-4 divide-y divide-border">
                    {applicationStatuses.filter((status) => status !== 'Draft').map((status) => {
                      const count = data.applications.filter((a) => a.status === status).length
                      return <div key={status} className="flex items-center justify-between gap-3 py-3 text-sm"><span>{status}</span><span className="font-mono text-gold">{count}</span></div>
                    })}
                  </div>
                </div>
                <div className="rounded-sm border border-border bg-card p-5">
                  <h3 className="text-lg">Applications by category</h3>
                  <div className="mt-4 divide-y divide-border">
                    {(['vehicle', 'equipment', 'commercial-asset', 'other'] as const).map((category) => {
                      const rows = data.applications.filter((a) => a.category === category)
                      const amount = rows.reduce((sum, a) => sum + (a.financeAmount ?? 0), 0)
                      return <div key={category} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="capitalize">{category.replaceAll('-', ' ')}</span><span className="text-right"><span className="block font-mono text-gold">{rows.length} applications</span><span className="text-xs text-muted-foreground">{formatZAR(amount)}</span></span></div>
                    })}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">This report is an operational summary, not a credit assessment or lending decision. Reviewer reports are limited to assigned applications.</p>
            </section>
          )}

          {view === 'audit' && (
            <section className="rounded-sm border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-xl"><Activity className="size-5 text-gold" /> Administrative audit trail</h2>
              <div className="mt-4 divide-y divide-border">
                {data.audit.map((entry) => (
                  <div key={entry.id} className="py-3">
                    <p className="text-sm font-medium">{entry.event}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      By: {entry.actorName || entry.actorEmail || entry.actorUserId || (entry.event === 'user.super_admin_bootstrapped' ? 'System (one-time bootstrap)' : 'Unknown actor')} · {entry.resource} · {entry.resourceId || '—'} · {formatDateTime(String(entry.createdAt))}
                    </p>
                    {entry.details && entry.details !== '{}' && (
                      <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">{entry.details}</pre>
                    )}
                  </div>
                ))}
                {data.audit.length === 0 && <p className="py-5 text-sm text-muted-foreground">No audit events recorded yet.</p>}
              </div>
              {data.isSuperAdmin && (
                <div className="mt-8 border-t border-border pt-5">
                  <h3 className="text-lg font-semibold">Permission and role change history</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Restricted to the Super Administrator. Shows recorded before/after values and reasons where supplied.</p>
                  <div className="mt-3 divide-y divide-border">
                    {data.securityAudit.map((entry) => (
                      <div key={entry.id} className="py-3">
                        <p className="text-sm font-medium">{entry.action.replaceAll('_', ' ')}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          By: {entry.actorName || entry.actorEmail || entry.actorUserId || (entry.action === 'bootstrap_super_admin' ? 'System (one-time bootstrap)' : 'Unknown actor')} · Affected account: {entry.affectedUserId || '—'} · {entry.resource} · {entry.recordId || '—'} · {formatDateTime(String(entry.createdAt))}
                        </p>
                        {(entry.previousValue !== null || entry.newValue !== null) && (
                          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                            {entry.previousValue !== null && <div><p className="text-muted-foreground">Previous value</p><pre className="mt-1 whitespace-pre-wrap break-words rounded bg-muted/40 p-2">{entry.previousValue}</pre></div>}
                            {entry.newValue !== null && <div><p className="text-muted-foreground">New value</p><pre className="mt-1 whitespace-pre-wrap break-words rounded bg-muted/40 p-2">{entry.newValue}</pre></div>}
                          </div>
                        )}
                        {entry.reason && <p className="mt-2 text-xs"><span className="text-muted-foreground">Reason: </span>{entry.reason}</p>}
                      </div>
                    ))}
                    {data.securityAudit.length === 0 && <p className="py-4 text-sm text-muted-foreground">No role or permission changes recorded yet.</p>}
                  </div>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

function applicantName(application: OfficeData['applications'][number]) {
  return application.businessName || [application.firstName, application.lastName].filter(Boolean).join(' ') || 'Applicant'
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-sm border border-border bg-card p-5"><p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 font-display text-4xl text-gold">{value}</p></div>
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm">{value}</p></div>
}
