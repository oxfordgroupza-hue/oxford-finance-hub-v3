import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { SiteLayout } from '@/components/site/SiteLayout'
import { getAuthorizationSnapshot, loginWithPassword, registerCustomer, requestPasswordRecovery, completePasswordRecovery, verifyCustomerEmail } from '@/lib/auth'

type AuthMode = 'login' | 'signup' | 'recovery' | 'reset'

export const Route = createFileRoute('/login')({
  head: () => ({ meta: [{ title: 'Sign in | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const continueToWorkspace = useCallback(async (silent = false) => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated) {
      if (!silent) setMessage('Your Oxford session could not be confirmed. Please sign in again.')
      return
    }
    if (session.authenticated && 'emailVerificationRequired' in session && session.emailVerificationRequired) {
      setMessage('Please verify your email address using the confirmation link, then return here and sign in again.')
      return
    }
    if (session.authenticated && session.provisioned && !session.blocked) {
      if (session.isSuperAdmin) {
        await navigate({ to: '/admin' })
        return
      }
      if (session.user.accountType === 'office' && session.permissions.includes('office.view')) {
        await navigate({ to: '/office' })
        return
      }
      if (session.user.accountType === 'customer' && session.permissions.includes('own_applications.view')) {
        await navigate({ to: '/dashboard' })
        return
      }
      if (session.user.accountType === 'partner' && session.permissions.includes('partner_referrals.view')) {
        await navigate({ to: '/partner' })
        return
      }
      setMessage('Your account is recognised but does not currently have workspace access. Please contact Oxford Business Group.')
      return
    }
    if (session.authenticated && !session.provisioned) {
      setMessage('Your account needs secure activation or email verification before workspace access can be granted.')
      return
    }
    setMessage('Your sign-in could not be confirmed. Please sign in again.')
  }, [navigate])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const params = new URLSearchParams(window.location.search)
        if (params.get('verify')) {
          await verifyCustomerEmail({ data: { token: params.get('verify')! } })
          window.history.replaceState(null, '', '/login')
          if (active) setMessage('Your email address has been verified. You can now sign in.')
          return
        }
        if (params.get('reset') === '1' && params.get('token')) {
          setResetToken(params.get('token'))
          setMode('reset')
          window.history.replaceState(null, '', '/login?reset=1')
          return
        }
        if (params.get('signup') === '1') setMode('signup')
        if (params.get('resolve') === '1') await continueToWorkspace()
        else {
          const session = await getAuthorizationSnapshot()
          if (active && session.authenticated) await continueToWorkspace()
        }
      } catch {
        if (active) setError('The secure Oxford sign-in service is temporarily unavailable. Please try again shortly.')
      }
    })()
    // A login page may remain open in another tab while the user verifies email
    // or signs in elsewhere. Re-check the server session when this tab becomes active.
    const resumeIfAuthenticated = () => {
      if (active && document.visibilityState === 'visible') {
        void continueToWorkspace(true).catch(() => {
          // Keep the current screen usable if the session check is temporarily unavailable.
        })
      }
    }
    window.addEventListener('focus', resumeIfAuthenticated)
    document.addEventListener('visibilitychange', resumeIfAuthenticated)
    return () => {
      active = false
      window.removeEventListener('focus', resumeIfAuthenticated)
      document.removeEventListener('visibilitychange', resumeIfAuthenticated)
    }
  }, [continueToWorkspace])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')


    if (['login', 'signup', 'recovery'].includes(mode) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address to continue.')
      return
    }
    if (['login', 'signup', 'reset'].includes(mode) && password.length < 12) {
      setError('Your password must contain at least 12 characters.')
      return
    }
    if (mode === 'signup' && !fullName.trim()) {
      setError('Enter your full name to create an account.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        await loginWithPassword({ data: { email: email.trim(), password } })
        await continueToWorkspace()
        return
      }
      if (mode === 'signup') {
        await registerCustomer({ data: { email: email.trim(), fullName: fullName.trim(), password } })
        setMessage('If the address can be registered, a verification email will be sent. Follow its link before signing in.')
        setMode('login'); setPassword(''); return
      }
      if (mode === 'recovery') {
        await requestPasswordRecovery({ data: { email: email.trim() } })
        setMessage('If the address belongs to an active Oxford account, a recovery email will be sent.')
        return
      }
      if (mode === 'reset' && resetToken) {
        await completePasswordRecovery({ data: { token: resetToken, password } })
        setResetToken(null); setPassword(''); setMode('login')
        setMessage('Your password has been updated. You can now sign in.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The request could not be completed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'signup' ? 'Create a customer account'
    : mode === 'recovery' ? 'Recover your account'
        : mode === 'reset' ? 'Set a new password'
          : 'Welcome back'

  return (
    <SiteLayout>
      <section className="mx-auto max-w-xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-[#111111] p-6 shadow-2xl sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c7a45a]">Oxford Finance Hub</p>
          <h1 className="mt-3 font-serif text-4xl text-white">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Secure access for customers and authorised Oxford office personnel.
          </p>

          {message && <div role="status" className="mt-6 rounded-lg border border-[#c7a45a]/30 bg-[#c7a45a]/10 p-3 text-sm text-[#ead7a8]">{message}</div>}
          {error && <div role="alert" className="mt-6 rounded-lg border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</div>}

          <form noValidate onSubmit={submit} className="mt-7 space-y-5">
            {(mode === 'login' || mode === 'signup' || mode === 'recovery') && (
              <label className="block space-y-2">
                <span className="text-sm text-white/80">Email address</span>
                <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#c7a45a]" />
              </label>
            )}
            {mode === 'signup' && (
              <label className="block space-y-2">
                <span className="text-sm text-white/80">Full name</span>
                <input required autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#c7a45a]" />
              </label>
            )}
            {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
              <label className="block space-y-2">
                <span className="text-sm text-white/80">{mode === 'login' ? 'Password' : 'Choose a password'}</span>
                <input required minLength={12} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#c7a45a]" />
              </label>
            )}
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-[#c7a45a] px-5 py-3 font-semibold text-black transition hover:bg-[#d9bd7e] disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'recovery' ? 'Send recovery link' : mode === 'reset' ? 'Update password' : 'Continue'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
              <button type="button" onClick={() => { setMode('signup'); setError(''); setMessage('') }} className="text-[#d7b96f] hover:text-white">Create customer account</button>
              <button type="button" onClick={() => { setMode('recovery'); setError(''); setMessage('') }} className="text-white/60 hover:text-white">Forgot password?</button>
            </div>
          )}
          {mode !== 'login' && (
            <button type="button" onClick={() => { setMode('login'); setError(''); setMessage('') }} className="mt-6 text-sm text-[#d7b96f] hover:text-white">Return to sign in</button>
          )}
        </div>
      </section>
    </SiteLayout>
  )
}
