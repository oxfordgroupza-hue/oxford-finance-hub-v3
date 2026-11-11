import { useMemo, useState, type FormEvent } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WorkspaceSignOutButton } from '@/components/site/WorkspaceSignOutButton'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { createOfficeApplicantIntake, getOfficeApplicantIntakes, getOfficeIntakeOptions, resendOfficeApplicantInvitation, revokeOfficeApplicantIntake } from '@/lib/office-intake-actions'

export const Route = createFileRoute('/office/intakes')({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked) throw redirect({ to: '/login' })
    if (session.user.accountType !== 'office' ||
        (!session.isSuperAdmin && !session.permissions.includes('applications.create'))) throw redirect({ to: '/office' })
  },
  loader: async () => {
    const [intakes, options] = await Promise.all([getOfficeApplicantIntakes(), getOfficeIntakeOptions()])
    return { ...intakes, ...options }
  },
  head: () => ({ meta: [{ title: 'Applicant intake | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: OfficeIntakesPage,
})

function OfficeIntakesPage() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [applicantEmail, setApplicantEmail] = useState('')
  const [applicantName, setApplicantName] = useState('')
  const [phone, setPhone] = useState('')
  const [applicantType, setApplicantType] = useState<'individual' | 'business'>('individual')
  const [category, setCategory] = useState<'vehicle' | 'equipment' | 'commercial-asset' | 'other'>('equipment')
  const [assetTypeId, setAssetTypeId] = useState('')
  const [financeAmount, setFinanceAmount] = useState('')
  const [partnerRegistrationId, setPartnerRegistrationId] = useState('')
  const [busy, setBusy] = useState(false)
  const availableAssets = useMemo(() => data.assets.filter((asset) => asset.financeCategory === category), [data.assets, category])

  const refresh = async () => { await router.invalidate() }
  const createIntake = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (!assetTypeId) { toast.error('Select an asset from the catalogue.'); return }
    setBusy(true)
    try {
      const result = await createOfficeApplicantIntake({ data: {
        applicantEmail, applicantType, applicantName, phone: phone || undefined,
        category, assetTypeId, financeAmount: financeAmount ? Number(financeAmount) : undefined,
        partnerRegistrationId: partnerRegistrationId || undefined,
      } })
      toast.success(`Invitation queued for ${applicantEmail}. Reference: ${result.reference}`)
      setApplicantEmail(''); setApplicantName(''); setPhone(''); setFinanceAmount(''); setAssetTypeId(''); setPartnerRegistrationId('')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The applicant intake could not be created.')
    } finally { setBusy(false) }
  }
  const resend = async (intakeId: string) => {
    if (busy) return
    setBusy(true)
    try {
      const result = await resendOfficeApplicantInvitation({ data: { intakeId } })
      toast.success(`A fresh 72-hour invitation has been queued for ${result.reference}.`)
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The invitation could not be resent.')
    } finally { setBusy(false) }
  }

  const revoke = async (intakeId: string) => {
    if (busy) return
    setBusy(true)
    try {
      await revokeOfficeApplicantIntake({ data: { intakeId } })
      toast.success('Invitation revoked. Its token can no longer be used.')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The invitation could not be revoked.')
    } finally { setBusy(false) }
  }

  return <div className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border bg-card px-5 py-5 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div><p className="eyebrow">Oxford Business Group</p><h1 className="mt-1 font-display text-3xl">Applicant intake & invitations</h1><p className="mt-1 text-xs text-muted-foreground">Start a walk-in or referred application. Applicants create or use their own verified account to continue.</p></div>
        <div className="flex flex-wrap items-center gap-3"><Button asChild variant="outlineGold"><a href="/office">Back to office</a></Button><WorkspaceSignOutButton /></div>
      </div>
    </header>
    <main className="mx-auto grid max-w-7xl gap-7 px-5 py-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:px-8">
      <form onSubmit={createIntake} className="space-y-5 rounded-sm border border-border bg-card p-6">
        <div><p className="text-xs uppercase tracking-wider text-gold">New secure intake</p><h2 className="mt-1 text-2xl">Applicant details</h2><p className="mt-2 text-sm text-muted-foreground">Only contact and starter information is collected here. Identity, income, bank and address documents are completed securely by the applicant after verification.</p></div>
        <div className="space-y-2"><Label htmlFor="intake-name">Applicant / business name</Label><Input id="intake-name" value={applicantName} onChange={(e) => setApplicantName(e.target.value)} required minLength={2} maxLength={160} /></div>
        <div className="space-y-2"><Label htmlFor="intake-email">Applicant email</Label><Input id="intake-email" type="email" value={applicantEmail} onChange={(e) => setApplicantEmail(e.target.value)} required maxLength={254} /></div>
        <div className="space-y-2"><Label htmlFor="intake-phone">Contact number (optional)</Label><Input id="intake-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Applicant type</Label><Select value={applicantType} onValueChange={(v) => setApplicantType(v as 'individual' | 'business')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="individual">Individual</SelectItem><SelectItem value="business">Business</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Finance category</Label><Select value={category} onValueChange={(v) => { setCategory(v as typeof category); setAssetTypeId('') }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="vehicle">Vehicle finance</SelectItem><SelectItem value="equipment">Equipment finance</SelectItem><SelectItem value="commercial-asset">Commercial asset finance</SelectItem><SelectItem value="other">Other finance</SelectItem></SelectContent></Select></div>
        </div>
        <div className="space-y-2"><Label>Asset / equipment</Label><Select value={assetTypeId} onValueChange={setAssetTypeId}><SelectTrigger><SelectValue placeholder="Select from the asset catalogue" /></SelectTrigger><SelectContent>{availableAssets.map((asset) => <SelectItem key={asset.id} value={asset.id}>{asset.industryName} · {asset.categoryName} · {asset.name}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">Only active Super Admin catalogue options are available.</p></div>
        <div className="space-y-2"><Label htmlFor="intake-amount">Estimated principal loan amount (ZAR, optional)</Label><Input id="intake-amount" type="number" min={10000} max={2000000000} step={1} value={financeAmount} onChange={(e) => setFinanceAmount(e.target.value)} /></div>
        <div className="space-y-2"><Label>Referring merchant partner (optional)</Label><Select value={partnerRegistrationId} onValueChange={(value) => setPartnerRegistrationId(value === 'none' ? '' : value)}><SelectTrigger><SelectValue placeholder="No partner selected" /></SelectTrigger><SelectContent><SelectItem value="none">No referring partner</SelectItem>{data.partners.map((partner) => <SelectItem key={partner.id} value={partner.id}>{partner.businessName}</SelectItem>)}</SelectContent></Select></div>
        <Button type="submit" variant="gold" className="w-full" disabled={busy || data.assets.length === 0}>{busy ? 'Processing…' : 'Create intake & queue invitation'}</Button>
        <p className="text-xs text-muted-foreground">Invitations expire after 72 hours. Email delivery remains restricted to the approved Deploy Preview until separately verified.</p>
      </form>
      <section className="rounded-sm border border-border bg-card p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-wider text-gold">Intake register</p><h2 className="mt-1 text-2xl">Recent invitations</h2></div><Button type="button" variant="outlineGold" size="sm" onClick={() => void refresh()}>Refresh</Button></div>
        <div className="mt-5 space-y-3">
          {data.intakes.map((intake) => <article key={intake.id} className="rounded-sm border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{intake.applicantName}</p><p className="text-xs text-muted-foreground">{intake.applicantEmail} · {intake.reference}</p></div><span className="rounded-full border border-border px-2 py-1 text-xs">{intake.status.replaceAll('_', ' ')}</span></div>
            <p className="mt-2 text-sm text-muted-foreground">{intake.assetTypeName || intake.category} · {intake.applicantType}</p>
            <p className="mt-1 text-xs text-muted-foreground">Expires: {new Date(intake.tokenExpiresAt).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</p>
            {intake.status !== 'claimed' && intake.status !== 'revoked' && <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outlineGold" size="sm" disabled={busy} onClick={() => void resend(intake.id)}>Resend invitation</Button><Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void revoke(intake.id)}>Revoke invitation</Button></div>}
          </article>)}
          {data.intakes.length === 0 && <p className="rounded-sm border border-dashed border-border p-6 text-sm text-muted-foreground">No applicant intakes have been created yet.</p>}
        </div>
      </section>
    </main>
  </div>
}
