import { useState, type FormEvent } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { getSettlementWorkspaceData, recordConfirmedSettlement, recordSettlementAdjustment } from '@/lib/settlement-actions'
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
  const [actualAmount, setActualAmount] = useState('')
  const [settledAt, setSettledAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [adjustmentSettlementId, setAdjustmentSettlementId] = useState('')
  const [adjustmentType, setAdjustmentType] = useState<'reversal' | 'correction'>('reversal')
  const [adjustmentReference, setAdjustmentReference] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [correctedAmount, setCorrectedAmount] = useState('')
  const [adjustmentBusy, setAdjustmentBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      await recordConfirmedSettlement({
        data: {
          applicationId,
          settlementReference,
          actualFunderSettlementAmount: actualAmount,
          settledAt: new Date(settledAt).toISOString(),
        },
      })
      toast.success('Confirmed funder settlement recorded with an immutable fee snapshot.')
      setApplicationId(''); setSettlementReference(''); setActualAmount(''); setSettledAt('')
      await router.invalidate()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Settlement could not be recorded.')
    } finally {
      setBusy(false)
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
        ...(adjustmentType === 'correction' ? { correctedActualFunderSettlementAmount: correctedAmount } : {}),
      } })
      toast.success('Settlement adjustment recorded.')
      setAdjustmentSettlementId('')
      setAdjustmentReference('')
      setAdjustmentReason('')
      setCorrectedAmount('')
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
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">Record a funder settlement only after the amount has actually been confirmed. Each record preserves the approved amount, actual receipt, calculated fees and fee-terms version. Original records cannot be edited or deleted. Reversals and corrections are recorded separately by Super Administrators.</p>
          </div>
          <WorkspaceSignOutButton />
        </header>

        <section className="rounded-lg border border-white/10 bg-[#121212] p-5 sm:p-6">
          <h2 className="font-serif text-2xl">Capture confirmed funder settlement</h2>
          <p className="mt-2 text-sm text-white/55">Only applications with a recorded provider approval and an approved linked merchant partner are eligible. No payment is initiated by this action.</p>
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
            <label className="space-y-2 text-sm"><span className="text-white/70">Actual amount received (ZAR)</span>
              <input required inputMode="decimal" pattern="\d{1,12}(\.\d{1,2})?" value={actualAmount} onChange={(e) => setActualAmount(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" placeholder="e.g. 990000.00" />
            </label>
            <label className="space-y-2 text-sm"><span className="text-white/70">Date funder settlement was received</span>
              <input required type="datetime-local" value={settledAt} onChange={(e) => setSettledAt(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" />
            </label>
            <div className="md:col-span-2"><button disabled={busy || !applicationId || !settlementReference.trim() || !actualAmount || !settledAt} className="rounded-md bg-[#c7a45a] px-5 py-3 text-sm font-semibold text-black disabled:opacity-50">{busy ? 'Recording…' : 'Record confirmed settlement'}</button></div>
          </form>
          {data.eligibleApplications.length === 0 && <p className="mt-4 text-sm text-amber-200/80">No approved applications with an approved merchant partner are currently eligible.</p>}
        </section>

        {data.isSuperAdmin && <section className="rounded-lg border border-[#c7a45a]/30 bg-[#121212] p-5 sm:p-6">
          <h2 className="font-serif text-2xl">Reverse or correct a settlement</h2>
          <p className="mt-2 text-sm text-white/55">The original record remains unchanged. A correction records the delta to the corrected actual receipt; a reversal offsets the current effective settlement. One correction and one reversal are allowed per settlement.</p>
          <form onSubmit={submitAdjustment} className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm"><span>Original settlement</span>
              <select required value={adjustmentSettlementId} onChange={(e) => setAdjustmentSettlementId(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white">
                <option value="">Select settlement</option>
                {data.records.filter((item) => !data.adjustments.some((a) => a.settlementId === item.id && a.adjustmentType === 'reversal')).map((item) => <option key={item.id} value={item.id}>{item.settlementReference} · {item.applicationReferenceSnapshot}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-sm"><span>Adjustment type</span>
              <select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value as 'reversal' | 'correction')} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white"><option value="reversal">Full reversal</option><option value="correction">Correct actual settlement amount</option></select>
            </label>
            <label className="space-y-2 text-sm"><span>Adjustment reference</span>
              <input required minLength={3} maxLength={100} value={adjustmentReference} onChange={(e) => setAdjustmentReference(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" />
            </label>
            {adjustmentType === 'correction' && <label className="space-y-2 text-sm"><span>Correct actual funder settlement (ZAR)</span>
              <input required inputMode="decimal" pattern="\d{1,12}(\.\d{1,2})?" value={correctedAmount} onChange={(e) => setCorrectedAmount(e.target.value)} className="w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" />
            </label>}
            <label className="space-y-2 text-sm md:col-span-2"><span>Reason and supporting reference</span>
              <textarea required minLength={10} maxLength={1000} value={adjustmentReason} onChange={(e) => setAdjustmentReason(e.target.value)} className="min-h-24 w-full rounded-md border border-white/15 bg-black/30 px-3 py-3 text-white" />
            </label>
            <div className="md:col-span-2"><button disabled={adjustmentBusy || !adjustmentSettlementId || adjustmentReference.trim().length < 3 || adjustmentReason.trim().length < 10 || (adjustmentType === 'correction' && !correctedAmount)} className="rounded-md border border-[#c7a45a] px-5 py-3 text-sm font-semibold text-[#d8bd7c] disabled:opacity-50">{adjustmentBusy ? 'Recording…' : 'Record immutable adjustment'}</button></div>
          </form>
        </section>}

        <section className="rounded-lg border border-white/10 bg-[#121212] p-5 sm:p-6">
          <h2 className="font-serif text-2xl">Settlement ledger</h2>
          <p className="mt-1 text-sm text-white/50">Office-only fee breakdown. All amounts are in ZAR. These records are not payment instructions.</p>
          {data.records.length === 0 ? <p className="mt-5 text-sm text-white/55">No confirmed settlements have been recorded.</p> : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[1180px] text-left text-sm">
                <thead className="border-b border-white/10 text-xs text-white/45"><tr>{['Settlement / application','Partner','Approved amount','Actual received','Documentation','Facilitation','Admin','Partner net','Terms','Settled'].map((x) => <th key={x} className="px-3 py-3 font-medium">{x}</th>)}</tr></thead>
                <tbody className="divide-y divide-white/10">
                  {data.records.map((item) => <tr key={item.id}>
                    <td className="px-3 py-4"><p className="font-mono text-[#d8bd7c]">{item.settlementReference}</p><p className="mt-1 text-xs text-white/45">{item.applicationReferenceSnapshot}</p></td>
                    <td className="px-3 py-4">{item.partnerBusinessNameSnapshot}</td>
                    <td className="px-3 py-4">{formatZAR(item.approvedFinanceAmountCents / 100)}</td>
                    <td className="px-3 py-4">{formatZAR(item.actualFunderSettlementAmountCents / 100)}</td>
                    <td className="px-3 py-4">{formatZAR(item.documentationFeeCents / 100)}</td>
                    <td className="px-3 py-4">{formatZAR(item.facilitationFeeCents / 100)}</td>
                    <td className="px-3 py-4">{formatZAR(item.adminFeeCents / 100)}</td>
                    <td className="px-3 py-4 font-semibold text-[#d8bd7c]">{formatZAR(item.partnerNetPayableCents / 100)}</td>
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
