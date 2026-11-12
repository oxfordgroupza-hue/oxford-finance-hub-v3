import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createPartnerApplicantIntake } from '@/lib/office-intake-actions'
import { formatDateTime } from '@/lib/format'

type FinanceCategory = 'vehicle' | 'equipment' | 'commercial-asset' | 'other'

type PartnerIntakeAsset = {
  id: string
  name: string
  categoryName: string
  financeCategory: FinanceCategory
  industryName: string
}

type PartnerIntakeRow = {
  id: string
  reference: string
  category: FinanceCategory
  assetTypeName: string | null
  status: string
  tokenExpiresAt: Date | string
  createdAt: Date | string
}

export function PartnerReferralStarter({
  assets,
  intakes,
  approved,
}: {
  assets: PartnerIntakeAsset[]
  intakes: PartnerIntakeRow[]
  approved: boolean
}) {
  const router = useRouter()
  const [applicantEmail, setApplicantEmail] = useState('')
  const [applicantName, setApplicantName] = useState('')
  const [phone, setPhone] = useState('')
  const [applicantType, setApplicantType] = useState<'individual' | 'business'>('individual')
  const [category, setCategory] = useState<FinanceCategory>('equipment')
  const [assetTypeId, setAssetTypeId] = useState('')
  const [busy, setBusy] = useState(false)
  const availableAssets = useMemo(
    () => assets.filter((asset) => asset.financeCategory === category),
    [assets, category],
  )

  const createIntake = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    if (!assetTypeId) {
      toast.error('Select an asset from the approved catalogue.')
      return
    }
    setBusy(true)
    try {
      const result = await createPartnerApplicantIntake({
        data: {
          applicantEmail,
          applicantType,
          applicantName,
          phone: phone || undefined,
          category,
          assetTypeId,
        },
      })
      toast.success(`Starter reference ${result.reference} created. The applicant invitation has been queued.`)
      setApplicantEmail('')
      setApplicantName('')
      setPhone('')
      setAssetTypeId('')
      await router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The referral starter could not be created.')
    } finally {
      setBusy(false)
    }
  }

  const outstanding = intakes.filter((intake) => intake.status !== 'claimed')

  return (
    <section className="rounded-sm border border-gold/30 bg-card p-6 sm:p-8">
      <div>
        <p className="text-xs uppercase tracking-wider text-gold">Partner-originated referral</p>
        <h2 className="mt-1 text-2xl">Introduce a prospective applicant</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Create a minimal starter record using the applicant's name, email and optional phone number, plus the finance category and asset. The applicant must use their own account, verify their email and complete the protected application themselves. Do not enter identity numbers, addresses, income details or bank information here.
        </p>
      </div>

      {!approved ? (
        <p className="mt-5 rounded-sm border border-border bg-background p-4 text-sm text-muted-foreground">
          Only approved, active merchant partners may create referral starter records.
        </p>
      ) : (
        <form onSubmit={createIntake} className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="partner-intake-name">Applicant / business name</Label>
            <Input id="partner-intake-name" value={applicantName} onChange={(event) => setApplicantName(event.target.value)} required minLength={2} maxLength={160} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner-intake-email">Applicant email</Label>
            <Input id="partner-intake-email" type="email" value={applicantEmail} onChange={(event) => setApplicantEmail(event.target.value)} required maxLength={254} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partner-intake-phone">Contact number (optional)</Label>
            <Input id="partner-intake-phone" value={phone} onChange={(event) => setPhone(event.target.value)} maxLength={40} />
          </div>
          <div className="space-y-2">
            <Label>Applicant type</Label>
            <Select value={applicantType} onValueChange={(value) => setApplicantType(value as 'individual' | 'business')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Finance category</Label>
            <Select value={category} onValueChange={(value) => { setCategory(value as FinanceCategory); setAssetTypeId('') }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vehicle">Vehicle finance</SelectItem>
                <SelectItem value="equipment">Equipment finance</SelectItem>
                <SelectItem value="commercial-asset">Commercial asset finance</SelectItem>
                <SelectItem value="other">Other finance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Asset / equipment</Label>
            <Select value={assetTypeId} onValueChange={setAssetTypeId}>
              <SelectTrigger><SelectValue placeholder="Select from the asset catalogue" /></SelectTrigger>
              <SelectContent>
                {availableAssets.map((asset) => (
                  <SelectItem key={asset.id} value={asset.id}>
                    {asset.industryName} · {asset.categoryName} · {asset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Only active Super Admin catalogue options are available.</p>
          </div>
          <div className="md:col-span-2">
            <Button type="submit" variant="gold" className="w-full sm:w-auto" disabled={busy || assets.length === 0 || !assetTypeId}>
              {busy ? 'Creating starter…' : 'Create referral starter & queue invitation'}
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Invitations expire after 72 hours. Email delivery is still gated until Oxford configures and verifies its email provider. You will see the reference and status only, never the applicant's private documents or financial details.
            </p>
          </div>
        </form>
      )}

      <div className="mt-7 border-t border-border pt-5">
        <h3 className="text-lg font-medium">My referral starters</h3>
        {outstanding.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">You have no unclaimed referral starter records.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {outstanding.map((intake) => (
              <div key={intake.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-mono text-sm text-gold">{intake.reference}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{intake.category} · {intake.assetTypeName ?? 'Asset to be confirmed'} · Created {formatDateTime(String(intake.createdAt))}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Invitation expiry: {formatDateTime(String(intake.tokenExpiresAt))}</p>
                </div>
                <span className="rounded-full border border-border px-2 py-1 text-xs capitalize">{intake.status.replaceAll('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
