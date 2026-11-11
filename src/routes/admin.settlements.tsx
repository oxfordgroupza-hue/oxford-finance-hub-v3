import { useState, type FormEvent } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { activatePartnerCommercialTerms, createPartnerCommercialTermsDraft, getSettlementWorkspaceData, recordConfirmedSettlement, recordSettlementAdjustment } from '@/lib/settlement-actions'
import { formatZAR, formatDateTime } from '@/lib/format'
import { WorkspaceSignOutButton } from '@/components/site/WorkspaceSignOutButton'

export const Route = createFileRoute('/admin/settlements')({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked ||
        session.user.accountType !== 'office' ||
        (!session.isSuperAdmin && !session.permissions.includes('settlements.view'))) {
      throw redirect({ to: '/login' })
    }
  },
  loader: () => getSettlementWorkspaceData(),
  head: () => ({ meta: [{ title: 'Settlements | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: SettlementWorkspace,
})

function SettlementWorkspace() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [applicationId, setApplicationId] = useState('')
  const [settlementReference, setSettlementReference] = useState('')
  const [grossAmount, setGrossAmount] = useState('')
  const [settledAt, setSettledAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [adjustmentSettlementId, setAdjustmentSettlementId] = useState('')
  const [adjustmentType, setAdjustmentType] = useState<'reversal' | 'correction'>('reversal')
  const [adjustmentReference, setAdjustmentReference] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [correctedGrossAmount, setCorrectedGrossAmount] = useState('')
  const [adjustmentBusy, setAdjustmentBusy] = useState(false)
  const [termsPartnerId, setTermsPartnerId] = useState('')
  const [facilitationPercent, setFacilitationPercent] = useState('')
  const [adminFeeMode, setAdminFeeMode] = useState<'percentage' | 'fixed'>('percentage')
  const [adminPercent, setAdminPercent] = useState('')
  const [adminFixedAmount, setAdminFixedAmount] = useState('')
  const [termsRationale, setTermsRationale] = useState('')
  const [termsBusy, setTermsBusy] = useState(false)
  const [activatingTermsId, setActivatingTermsId] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await recordConfirmedSettlement({
        data: {
          applicationId,
          settlementReference,
          grossFunderSettlementAmount: grossAmount,
          settledAt: new Date(settledAt).toISOString(),
        },
      })
      toast.success('Confirmed funder settlement recorded with an immutable fee snapshot.')
      setApplicationId(''); setSettlementReference(''); setGrossAmount(''); setSettledAt('')
      await router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Settlement could not be recorded.')
    } finally {
      setBusy(false)
    }
  }

  const submitTerms = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (termsBusy) return
    setTermsBusy(true)
    try {
      await createPartnerCommercialTermsDraft({ data: {
        partnerRegistrationId: termsPartnerId,
        facilitationRateBps: Math.round(Number(facilitationPercent) * 100),
        adminFeeMode,
        adminRateBps: adminFeeMode === 'percentage' ? Math.round(Number(adminPercent) * 100) : 0,
        adminFixedAmountCents: adminFeeMode === 'fixed' ? Math.round(Number(adminFixedAmount) * 100) : null,
        rationale: termsRationale,
      } })
      toast.success('Partner-specific terms draft created. Review it below and activate it separately.')
      setTermsPartnerId('')
      setFacilitationPercent('')
      setAdminPercent('')
      setAdminFixedAmount('')
      setTermsRationale('')
      await router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Partner terms draft could not be created.')
    } finally {
      setTermsBusy(false)
    }
  }

  const activateTerms = async (termsId: string) => {
    if (activatingTermsId) return
    setActivatingTermsId(termsId)
    try {
      await activatePartnerCommercialTerms({ data: { termsId } })
      toast.success('Partner-specific terms approved and activated. Earlier versions remain preserved.')
      await router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Partner terms could not be activated.')
    } finally {
      setActivatingTermsId('')
    }
  }

  const submitAdjustment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (adjustmentBusy) return
    setAdjustmentBusy(true)
    try {
      await recordSettlementAdjustment({ data: {
        settlementId: adjustmentSettlementId,
        adjustmentType,
        adjustmentReference,
        reason: adjustmentReason,
        ...(adjustmentType === 'correction' ? { correctedGrossFunderSettlementAmount: correctedGrossAmount } : {}),
      } })
      toast.success('Settlement adjustment recorded.')
      setAdjustmentSettlementId('')
      setAdjustmentReference('')
      setAdjustmentReason('')
      setCorrectedGrossAmount('')
      await router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Settlement adjustment could not be recorded.')
    } finally {
      setAdjustmentBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] px-5 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c7a45a]">Super Admin · Office finance control</p>
            <h1 className="mt-2 font-serif text-4xl">Confirmed settlements</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">Record a funder settlement only after it has been confirmed. Enter the gross funder settlement before the fixed 1% documentation deduction. That deduction is calculated on the approved finance amount; the approved partner-specific facilitation and administration terms are then applied to partner gross payable. No additional VAT is added. Original records cannot be edited or deleted. Reversals and corrections are recorded separately by Super Administrators.</p>
          </div>
          <WorkspaceSignOutButton />
        </header>

        {data.isSuperAdmin && <section className="rounded-lg border border-[#c7a45a]/30 bg-[#121212] p-5 sm:p-6">
          <h2 className="font-serif text-2xl">Partner-specific commercial terms</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-white/55">Every merchant partner must have its own explicitly approved terms. There are no global facilitation or administration defaults; the 2% and 6.5% figures are examples only. The funder documentation deduction remains 1% of approved finance. Facilitation and administration are deducted from partner gross payable. No additional VAT is calculated. Creating a draft does not activate it; activation requires a separate Super Administrator approval.</p>

          <form onSubmit={submitTerms} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm"><span className="text-white/70">Approved merchant partner</span>
              <select required value={termsPartnerId} onChange={(e) => setTermsPartnerId(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white">
                <option value="">Select partner</option>
                {data.approvedPartners.map((partner) => <option key={partner.id} value={partner.id}>{partner.businessName}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm"><span className="text-white/70">Partner facilitation rate (%)</span>
              <input required type="number" min="0" max="100" step="0.01" inputMode="decimal" value={facilitationPercent} onChange={(e) => setFacilitationPercent(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" placeholder="Enter this partner's rate" />
            </label>
            <label className="space-y-2 text-sm"><span className="text-white/70">Administration fee type</span>
              <select value={adminFeeMode} onChange={(e) => setAdminFeeMode(e.target.value as 'percentage' | 'fixed')} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white">
                <option value="percentage">Percentage of partner gross payable</option>
                <option value="fixed">Fixed ZAR amount per settlement</option>
              </select>
            </label>
            {adminFeeMode === 'percentage'
              ? <label className="space-y-2 text-sm"><span className="text-white/70">Partner administration rate (%)</span>
                  <input required type="number" min="0" max="100" step="0.01" inputMode="decimal" value={adminPercent} onChange={(e) => setAdminPercent(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" placeholder="Enter this partner's rate" />
                </label>
              : <label className="space-y-2 text-sm"><span className="text-white/70">Fixed administration amount (ZAR)</span>
                  <input required type="number" min="0" step="0.01" inputMode="decimal" value={adminFixedAmount} onChange={(e) => setAdminFixedAmount(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" placeholder="Enter fixed amount" />
                </label>}
            <label className="space-y-2 text-sm md:col-span-2"><span className="text-white/70">Commercial terms rationale / agreement reference</span>
              <textarea required minLength={10} maxLength={1000} value={termsRationale} onChange={(e) => setTermsRationale(e.target.value)} className="min-h-24 w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" placeholder="Record the partner agreement or approval reference." />
            </label>
            <div className="md:col-span-2"><button disabled={termsBusy || !termsPartnerId || !facilitationPercent || (adminFeeMode === 'percentage' ? !adminPercent : !adminFixedAmount) || termsRationale.trim().length < 10} className="rounded-md bg-[#c7a45a] px-5 py-3 text-sm font-semibold text-black disabled:opacity-50">{termsBusy ? 'Saving draft…' : 'Create partner terms draft'}</button></div>
          </form>

          <div className="mt-7 space-y-3">
            <h3 className="font-serif text-xl">Terms history and approvals</h3>
            {data.partnerTerms.length === 0
              ? <p className="text-sm text-white/50">No partner-specific commercial terms have been configured. No rates are active.</p>
              : data.partnerTerms.map((terms) => <div key={terms.id} className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-white/10 p-4">
                  <div className="min-w-[240px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{terms.partnerBusinessName} · Version {terms.version}</p>
                      <span className={terms.status === 'active' ? 'rounded border border-emerald-500/30 px-2 py-1 text-xs text-emerald-300' : 'rounded border border-white/15 px-2 py-1 text-xs text-white/55'}>{terms.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-white/65">Facilitation: {(terms.facilitationRateBps / 100).toFixed(2)}% · Administration: {terms.adminFeeMode === 'percentage' ? `${(terms.adminRateBps / 100).toFixed(2)}%` : formatZAR((terms.adminFixedAmountCents ?? 0) / 100)}</p>
                    <p className="mt-1 text-xs text-white/45">{terms.rationale}</p>
                    <p className="mt-1 text-xs text-white/35">Created {formatDateTime(String(terms.createdAt))}{terms.approvedAt ? ` · Approved ${formatDateTime(String(terms.approvedAt))}` : ''}</p>
                  </div>
                  {terms.status === 'draft' && <button type="button" disabled={Boolean(activatingTermsId)} onClick={() => activateTerms(terms.id)} className="rounded-md border border-[#c7a45a] px-4 py-2 text-sm font-semibold text-[#d8bd7c] disabled:opacity-50">{activatingTermsId === terms.id ? 'Approving…' : 'Approve and activate'}</button>}
                </div>)}
          </div>
        </section>}

        <section className="rounded-lg border border-white/10 bg-[#121212] p-5 sm:p-6">
          <h2 className="font-serif text-2xl">Capture confirmed funder settlement</h2>
          <p className="mt-2 text-sm text-white/55">Only applications with provider approval, an approved active merchant partner and active Super Administrator-approved partner-specific terms are eligible. No payment is initiated by this action.</p>
          <form onSubmit={submit} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm"><span className="text-white/70">Approved application and partner</span>
              <select required value={applicationId} onChange={(e) => setApplicationId(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white">
                <option value="">Select approved application</option>
                {data.eligibleApplications.map((item) => <option key={item.id} value={item.id}>{item.reference} · {item.partnerBusinessName} · {formatZAR(item.financeAmount ?? 0)}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm"><span className="text-white/70">Funder settlement reference</span>
              <input required minLength={3} maxLength={100} value={settlementReference} onChange={(e) => setSettlementReference(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" placeholder="Enter funder reference" />
            </label>
            <label className="space-y-2 text-sm"><span className="text-white/70">Gross funder settlement before the 1% documentation deduction (ZAR)</span>
              <input required inputMode="decimal" pattern="\d{1,12}(\.\d{1,2})?" value={grossAmount} onChange={(e) => setGrossAmount(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" placeholder="e.g. 1000000.00" />
            </label>
            <label className="space-y-2 text-sm"><span className="text-white/70">Date of confirmed funder settlement</span>
              <input required type="datetime-local" value={settledAt} onChange={(e) => setSettledAt(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" />
            </label>
            <div className="md:col-span-2"><button disabled={busy || !applicationId || !settlementReference.trim() || !grossAmount || !settledAt} className="rounded-md bg-[#c7a45a] px-5 py-3 text-sm font-semibold text-black disabled:opacity-50">{busy ? 'Recording…' : 'Record confirmed settlement'}</button></div>
          </form>
          {data.eligibleApplications.length === 0 && <p className="mt-4 text-sm text-amber-200/80">No approved applications with active partner-specific terms are currently eligible. A Super Administrator must configure and activate terms for a merchant partner first.</p>}
        </section>

        {data.isSuperAdmin && <section className="rounded-lg border border-[#c7a45a]/30 bg-[#121212] p-5 sm:p-6">
          <h2 className="font-serif text-2xl">Reverse or correct a settlement</h2>
          <p className="mt-2 text-sm text-white/55">The original record remains unchanged. A correction recalculates the delta using the original partner-specific terms and the corrected gross funder settlement before the 1% documentation deduction; a reversal offsets the current effective settlement. One correction and one reversal are allowed per settlement.</p>
          <form onSubmit={submitAdjustment} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm"><span>Original settlement</span>
              <select required value={adjustmentSettlementId} onChange={(e) => setAdjustmentSettlementId(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white">
                <option value="">Select settlement</option>
                {data.records.filter((item) => !data.adjustments.some((a) => a.settlementId === item.id && a.adjustmentType === 'reversal')).map((item) => <option key={item.id} value={item.id}>{item.settlementReference} · {item.applicationReferenceSnapshot}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm"><span>Adjustment type</span>
              <select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value as 'reversal' | 'correction')} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white"><option value="reversal">Full reversal</option><option value="correction">Correct gross funder settlement amount</option></select>
            </label>
            <label className="space-y-2 text-sm"><span>Adjustment reference</span>
              <input required minLength={3} maxLength={100} value={adjustmentReference} onChange={(e) => setAdjustmentReference(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" />
            </label>
            {adjustmentType === 'correction' && <label className="space-y-2 text-sm"><span>Correct gross funder settlement before documentation deduction (ZAR)</span>
              <input required inputMode="decimal" pattern="\d{1,12}(\.\d{1,2})?" value={correctedGrossAmount} onChange={(e) => setCorrectedGrossAmount(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" />
            </label>}
            <label className="space-y-2 text-sm md:col-span-2"><span>Reason and supporting reference</span>
              <textarea required minLength={10} maxLength={1000} value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} className="min-h-24 w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" />
            </label>
            <div className="md:col-span-2"><button disabled={adjustmentBusy || !adjustmentSettlementId || adjustmentReference.trim().length < 3 || adjustmentReason.trim().length < 10 || (adjustmentType === 'correction' && !correctedGrossAmount)} className="rounded-md border border-[#c7a45a] px-5 py-3 text-sm font-semibold text-[#d8bd7c] disabled:opacity-50">{adjustmentBusy ? 'Recording…' : 'Record immutable adjustment'}</button></div>
          </form>
        </section>}

        <section className="rounded-lg border border-white/10 bg-[#121212] p-5 sm:p-6">
          <h2 className="font-serif text-2xl">Settlement ledger</h2>
          <p className="mt-1 text-sm text-white/50">Office-only fee breakdown. All amounts are in ZAR. These records are not payment instructions.</p>
          {data.records.length === 0 ? <p className="mt-5 text-sm text-white/55">No confirmed settlements have been recorded.</p> : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1400px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs text-white/45"><tr>{['Settlement / application','Partner','Approved amount','Gross funder settlement','Documentation','Partner gross','Facilitation','Admin','Partner net','Oxford total','Terms','Settled'].map((x) => <th key={x} className="px-3 py-3 font-medium">{x}</th>)}</tr></thead>
                <tbody className="divide-y divide-white/10">
                  {data.records.map((item) => <tr key={item.id}>
                    <td className="px-3 py-4"><p className="font-mono text-[#d8bd7c]">{item.settlementReference}</p><p className="mt-1 text-xs text-white/45">{item.applicationReferenceSnapshot}</p></td>
                    <td className="px-3 py-4">{item.partnerBusinessNameSnapshot}</td>
                    <td className="px-3 py-4">{formatZAR(item.approvedFinanceAmountCents / 100)}</td>
                    <td className="px-3 py-4">{formatZAR(item.actualFunderSettlementAmountCents / 100)}</td>
                    <td className="px-3 py-4"><p>{formatZAR(item.documentationFeeCents / 100)}</p><p className="mt-1 text-xs text-white/40">{(item.documentationFeeRateBps / 100).toFixed(2)}%</p></td>
                    <td className="px-3 py-4">{formatZAR(item.partnerGrossPayableCents / 100)}</td>
                    <td className="px-3 py-4"><p>{formatZAR(item.facilitationFeeCents / 100)}</p><p className="mt-1 text-xs text-white/40">{item.facilitationRateBps === null ? 'Historical terms' : `${(item.facilitationRateBps / 100).toFixed(2)}%`}</p></td>
                    <td className="px-3 py-4"><p>{formatZAR(item.adminFeeCents / 100)}</p><p className="mt-1 text-xs text-white/40">{item.adminFeeMode === 'percentage' ? `${(item.adminRateBps / 100).toFixed(2)}%` : item.adminFeeMode === 'fixed' ? 'Fixed amount' : 'Historical terms'}</p></td>
                    <td className="px-3 py-4 font-semibold text-[#d8bd7c]">{formatZAR(item.partnerNetPayableCents / 100)}</td>
                    <td className="px-3 py-4">{formatZAR(item.oxfordTotalFeesCents / 100)}</td>
                    <td className="px-3 py-4 text-xs text-white/50">{item.termsVersion}</td>
                    <td className="px-3 py-4 text-xs text-white/60">{formatDateTime(String(item.settledAt))}</td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          )}
          {data.adjustments.length > 0 && <div className="mt-8 border-t border-white/10 pt-5">
            <h3 className="font-serif text-xl">Adjustment history</h3>
            <div className="mt-3 space-y-3">{data.adjustments.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-3 rounded-md border border-white/10 p-3 text-sm">
              <div><p className="font-mono text-[#d8bd7c]">{item.adjustmentReference} · {item.adjustmentType}</p><p className="mt-1 text-xs text-white/50">{item.reason}</p></div>
              <p className="text-xs text-white/50">Partner net delta: {formatZAR(item.partnerNetDeltaCents / 100)}</p>
            </div>)}</div>
          </div>}
        </section>
      </div>
    </main>
  )
}
