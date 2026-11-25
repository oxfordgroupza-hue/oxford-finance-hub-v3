import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { SiteLayout } from '@/components/site/SiteLayout'
import { acceptStaffInvitation } from '@/lib/staff-invitation-actions'

export const Route = createFileRoute('/staff-invitation')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  head: () => ({ meta: [{ title: 'Activate staff account | Oxford Finance Hub' }, { name: 'robots', content: 'noindex,nofollow' }] }),
  component: StaffInvitationPage,
})

function StaffInvitationPage() {
  const { token } = Route.useSearch()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!token) { setError('This invitation link is incomplete. Request a new invitation from Oxford Business Group.'); return }
    if (password.length < 12) { setError('Your password must contain at least 12 characters.'); return }
    if (password !== confirmation) { setError('The passwords do not match.'); return }
    setBusy(true)
    setError('')
    try {
      await acceptStaffInvitation({ data: { token, password } })
      setComplete(true)
      window.location.assign('/login?staffActivated=1')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The staff invitation could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <SiteLayout>
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <div className="rounded-xl border border-white/10 bg-[#111111] p-7 shadow-2xl sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c7a45a]">Oxford Finance Hub · Staff access</p>
          <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">Activate your staff account</h1>
          <p className="mt-5 text-sm leading-7 text-white/70">Create a private password to activate your Oxford staff account. Invitation links are single-use and expire after 72 hours.</p>
          {!token ? (
            <p role="alert" className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-100">This invitation link is incomplete. Please use the full link in your invitation email.</p>
          ) : (
            <form onSubmit={(event) => void submit(event)} className="mt-7 grid gap-4">
              <label className="grid gap-2 text-sm text-white/70">New password
                <input type="password" autoComplete="new-password" minLength={12} maxLength={1024} required value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-white outline-none focus:border-[#c7a45a]" />
              </label>
              <label className="grid gap-2 text-sm text-white/70">Confirm password
                <input type="password" autoComplete="new-password" minLength={12} maxLength={1024} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="rounded-lg border border-white/15 bg-black/30 px-3 py-3 text-white outline-none focus:border-[#c7a45a]" />
              </label>
              {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">{error}</p>}
              <button type="submit" disabled={busy || complete} className="w-full rounded-lg bg-[#c7a45a] px-5 py-3 font-semibold text-black transition hover:bg-[#d9bd7e] disabled:cursor-not-allowed disabled:opacity-60">
                {busy ? 'Activating account…' : 'Activate staff account'}
              </button>
            </form>
          )}
          {complete && <p role="status" className="mt-5 text-sm text-[#e5cc91]">Your staff account is active. You can now sign in.</p>}
          <p className="mt-6 text-center text-sm text-white/50"><Link to="/login" className="text-[#e5cc91] hover:underline">Return to sign in</Link></p>
        </div>
      </section>
    </SiteLayout>
  )
}
