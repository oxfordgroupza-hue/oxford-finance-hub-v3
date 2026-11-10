import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { SiteLayout } from '@/components/site/SiteLayout'
import { claimOfficeApplicantIntake } from '@/lib/office-intake-actions'

export const Route = createFileRoute('/invitation')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  head: () => ({ meta: [{ title: 'Complete your application | Oxford Finance Hub' }, { name: 'robots', content: 'noindex,nofollow' }] }),
  component: ApplicantInvitationPage,
})

function ApplicantInvitationPage() {
  const { token } = Route.useSearch()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  const claim = async () => {
    if (!token || busy) return
    setBusy(true)
    setError('')
    try {
      const result = await claimOfficeApplicantIntake({ data: { token } })
      setComplete(true)
      window.location.assign(result.redirectTo)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The invitation could not be completed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-xl border border-white/10 bg-[#111111] p-7 shadow-2xl sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c7a45a]">Oxford Finance Hub</p>
          <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Continue your application</h1>
          {!token ? (
            <p role="alert" className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">
              This invitation link is incomplete. Please use the full link in the email sent by Oxford Business Group.
            </p>
          ) : (
            <>
              <p className="mt-5 text-sm leading-7 text-white/70">
                Oxford Business Group has prepared the starting details for your finance application. To protect your information, you must use your own account and verify the same email address that received this invitation.
              </p>
              <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm leading-6 text-white/70">
                <li>Sign in to your existing Oxford customer account, or create your own account.</li>
                <li>If you create an account, open the verification email and confirm your email address.</li>
                <li>Return to this invitation page in this tab and select Continue securely.</li>
              </ol>
              <a href="/login" target="_blank" rel="noreferrer" className="mt-7 inline-flex w-full items-center justify-center rounded-lg border border-[#c7a45a]/60 px-5 py-3 text-sm font-semibold text-[#e5cc91] transition hover:bg-[#c7a45a]/10">
                Sign in or create your account
              </a>
              {error && <p role="alert" className="mt-5 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
              {complete && <p role="status" className="mt-5 text-sm text-[#e5cc91]">Your application is ready. Opening your dashboard…</p>}
              <button type="button" onClick={() => void claim()} disabled={busy || complete} className="mt-4 w-full rounded-lg bg-[#c7a45a] px-5 py-3 font-semibold text-black transition hover:bg-[#d9bd7e] disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? 'Verifying invitation…' : 'Continue securely'}
              </button>
              <p className="mt-5 text-xs leading-5 text-white/45">
                This invitation is personal, expires after 72 hours and can only be claimed once. Do not forward it. If it has expired, contact Oxford Business Group for a replacement.
              </p>
            </>
          )}
        </div>
      </section>
    </SiteLayout>
  )
}
