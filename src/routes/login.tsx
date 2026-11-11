import { acceptInvite, getSettings, getUser, handleAuthCallback, login, requestPasswordRecovery, signup, updateUser } from '@netlify/identity'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { SiteLayout } from '@/components/site/SiteLayout'
import { getAuthorizationSnapshot } from '@/lib/auth'

type AuthMode = 'login' | 'signup' | 'recovery' | 'invite' | 'reset'

export const Route = createFileRoute('/login')({
  head: () => ({ meta: [{ title: 'Sign in | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: LoginPage,
})

function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const continueToWorkspace = useCallback(async () => {
    const session = await getAuthorizationSnapshot()
    if ('identityUnavailable' in session && session.identityUnavailable) {
      setError('Netlify Identity is not available yet. The project must be connected to a Netlify site with Identity enabled.')
      return
    }
    if (session.authenticated && 'emailVerificationRequired' in session && session.emailVerificationRequired) {
      setMessage('Please verify your email address using the confirmation link, then return here and sign in again.')
      return
    }
    if (session.authenticated && session.provisioned && !session.blocked) {
      if (session.isSuperAdmin) {
        window.location.assign('/admin')
        return
      }
      if (session.user.accountType === 'office' && session.permissions.includes('office.view')) {
        window.location.assign('/office')
        return
      }
      if (session.user.accountType === 'customer' && session.permissions.includes('own_applications.view')) {
        window.location.assign('/dashboard')
        return
      }
      if (session.user.accountType === 'partner' && session.permissions.includes('partner_referrals.view')) {
        window.location.assign('/partner')
        return
      }
      setMessage('Your account is recognised but does not currently have workspace access. Please contact Oxford Business Group.')
      return
    }
    if (session.authenticated && !session.provisioned) {
      setMessage('Your sign-in is recognised, but your Oxford account record is still being prepared. Please contact Oxford Business Group if this continues.')
      return
    }
    setMessage('Your sign-in could not be confirmed. Please sign in again.')
  }, [])

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        // Process Identity callback tokens before reading the reset query. A recovery
        // email may land directly on /login with its token in the URL fragment.
        await getSettings()
        const callback = await handleAuthCallback()
        if (!active) return
        if (callback?.type === 'invite' && callback.token) {
          setInviteToken(callback.token)
          setMode('invite')
          setMessage('An Oxford invitation was found. Choose a password to activate your account.')
          return
        }
        if (callback?.type === 'recovery' || new URLSearchParams(window.location.search).get('reset') === '1') {
          setMode('reset')
          setMessage('Choose a new password to complete account recovery.')
          return
        }
        if (callback?.user) {
          await continueToWorkspace()
          return
        }
        const currentUser = await getUser()
        if (currentUser) await continueToWorkspace()
      } catch {
        if (active) setError('Netlify Identity is not available yet. The project must be connected to a Netlify site with Identity enabled.')
      }
    })()
    return () => { active = false }
  }, [continueToWorkspace])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (['login', 'signup', 'recovery'].includes(mode) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter a valid email address to continue.')
      return
    }
    if (['login', 'signup', 'invite', 'reset'].includes(mode) && password.length < 8) {
      setError('Your password must contain at least 8 characters.')
      return
    }
    if (mode === 'signup' && !fullName.trim()) {
      setError('Enter your full name to create an account.')
      return
    }
    if (mode === 'invite' && !inviteToken) {
      setError('This invitation link is missing or has expired. Ask Oxford Business Group for a new invitation.')
      return
    }

    setBusy(true)
    try {
      if (mode === 'login') {
        // Netlify Identity sets the nf_jwt session cookie in the browser.
        // A full navigation ensures the next TanStack Start request carries it;
        // the protected route then resolves the authoritative server-side role.
        await login(email.trim(), password)
        await continueToWorkspace()
        return
      } else if (mode === 'signup') {
        await signup(email.trim(), password, { full_name: fullName.trim() })
        setMessage('Your account request has been received. Check your email for the confirmation link before signing in.')
        setMode('login')
        setPassword('')
      } else if (mode === 'recovery') {
        await requestPasswordRecovery(email.trim())
        setMessage('If the address is registered, a password recovery link will be sent to it.')
      } else if (mode === 'invite' && inviteToken) {
        await acceptInvite(inviteToken, password)
        setInviteToken(null)
        await continueToWorkspace()
      } else if (mode === 'reset') {
        await updateUser({ password })
        await continueToWorkspace()
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The request could not be completed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const title = mode === 'signup' ? 'Create a customer account'
    : mode === 'recovery' ? 'Recover your account'
      : mode === 'invite' ? 'Accept your invitation'
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
            {(mode === 'login' || mode === 'signup' || mode === 'invite' || mode === 'reset') && (
              <label className="block space-y-2">
                <span className="text-sm text-white/80">{mode === 'login' ? 'Password' : 'Choose a password'}</span>
                <input required minLength={8} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-lg border border-white/15 bg-black/30 px-4 py-3 text-white outline-none focus:border-[#c7a45a]" />
              </label>
            )}
            <button type="submit" disabled={busy} className="w-full rounded-lg bg-[#c7a45a] px-5 py-3 font-semibold text-black transition hover:bg-[#d9bd7e] disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'recovery' ? 'Send recovery link' : mode === 'invite' ? 'Accept invitation' : 'Update password'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
              <button type="button" onClick={() => { setMode('signup'); setError(''); setMessage('') }} className="text-[#d7b96f] hover:text-white">Create customer account</button>
              <button type="button" onClick={() => { setMode('recovery'); setError(''); setMessage('') }} className="text-white/60 hover:text-white">Forgot password?</button>
            </div>
          )}
          {mode !== 'login' && mode !== 'invite' && mode !== 'reset' && (
            <button type="button" onClick={() => { setMode('login'); setError(''); setMessage('') }} className="mt-6 text-sm text-[#d7b96f] hover:text-white">Return to sign in</button>
          )}
        </div>
      </section>
    </SiteLayout>
  )
}
