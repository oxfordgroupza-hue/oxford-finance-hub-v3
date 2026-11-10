import { useState } from 'react'
import { logout } from '@netlify/identity'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/** Sign out from every authenticated workspace, then return to the public site. */
export function WorkspaceSignOutButton() {
  const [busy, setBusy] = useState(false)

  const signOut = async () => {
    if (busy) return
    setBusy(true)
    try {
      await logout()
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
