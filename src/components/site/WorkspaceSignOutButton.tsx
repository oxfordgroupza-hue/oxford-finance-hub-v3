import { useState } from 'react'
import { logout } from '@netlify/identity'
import { logoutWithIdentity } from '@/lib/auth'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/** Sign out from every authenticated workspace, then return to the public site. */
export function WorkspaceSignOutButton() {
  const [busy, setBusy] = useState(false)

  const signOut = async () => {
    if (busy) return
    setBusy(true)
    try {
      // Clear the application session cookies before ending the browser Identity session.
      await logoutWithIdentity()
      await logout().catch(() => undefined)
      window.location.assign('/')
    } catch {
      toast.error('We could not sign you out. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Button type="button" size="sm" variant="outlineGold" disabled={busy} onClick={() => void signOut()}>
      {busy ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
