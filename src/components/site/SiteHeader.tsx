import { getUser, logout } from '@netlify/identity'
import { Link } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { BrandLogo } from './BrandLogo'

export const primaryNav = [
  { to: '/solutions', label: 'Finance solutions' },
  { to: '/partners', label: 'For partners' },
  { to: '/about', label: 'About us' },
  { to: '/contact', label: 'Contact' },
] as const

type WorkspaceLink = { to: '/admin' | '/office' | '/partner' | '/dashboard'; label: string }

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const [authenticated, setAuthenticated] = useState(false)
  const [workspace, setWorkspace] = useState<WorkspaceLink | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const user = await getUser()
        if (!active) return
        setAuthenticated(Boolean(user))
        if (!user) {
          setWorkspace(null)
          return
        }
        const session = await getAuthorizationSnapshot()
        if (!active) return
        if (!session.authenticated || !session.provisioned || session.blocked) {
          setWorkspace(null)
        } else if (session.isSuperAdmin) {
          setWorkspace({ to: '/admin', label: 'Administration' })
        } else if (session.user.accountType === 'office' && session.permissions.includes('office.view')) {
          setWorkspace({ to: '/office', label: 'Office workspace' })
        } else if (session.user.accountType === 'partner' && session.permissions.includes('partner_referrals.view')) {
          setWorkspace({ to: '/partner', label: 'Partner portal' })
        } else if (session.user.accountType === 'customer' && session.permissions.includes('own_applications.view')) {
          setWorkspace({ to: '/dashboard', label: 'My dashboard' })
        } else {
          setWorkspace(null)
        }
      } catch {
        if (active) {
          setAuthenticated(false)
          setWorkspace(null)
        }
      }
    })()
    return () => { active = false }
  }, [])

  async function handleSignOut() {
    if (signingOut) return
    setMobileMenuOpen(false)
    setSigningOut(true)
    try {
      await logout()
      setAuthenticated(false)
      setWorkspace(null)
      window.location.assign('/')
    } catch {
      toast.error('We could not sign you out. Please try again.')
      setSigningOut(false)
    }
  }

  return (
    <header
      className={cn(
        'z-40 w-full',
        overlay
          ? 'absolute inset-x-0 top-0 bg-gradient-to-b from-black/80 via-black/40 to-transparent'
          : 'sticky top-0 border-b border-border/70 bg-background/85 backdrop-blur-md',
      )}
    >
      <div className="mx-auto flex h-20 max-w-content items-center justify-between gap-6 px-4 sm:px-6">
        <BrandLogo />
        <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="text-sm text-foreground/80 transition-colors hover:text-gold motion-reduce:transition-none"
              activeProps={{ className: 'text-gold' }}
            >
              {item.label}
            </Link>
          ))}
          <span className="h-4 w-px bg-border" aria-hidden="true" />
          {authenticated ? (
            <>
              {workspace && (
                <Link
                  key={workspace.to}
                  to={workspace.to}
                  className="text-sm text-foreground/80 transition-colors hover:text-gold"
                  activeProps={{ className: 'text-gold' }}
                >
                  {workspace.label}
                </Link>
              )}
              <Button type="button" size="sm" variant="outline" disabled={signingOut} onClick={handleSignOut}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </>
          ) : (
            <Link to="/login" className="text-sm text-foreground/80 transition-colors hover:text-gold">
              Sign in
            </Link>
          )}
          <Button asChild size="sm" className="rounded-sm px-5 tracking-wide">
            <Link to="/apply">Applications paused</Link>
          </Button>
        </nav>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu />
          </Button>
          <SheetContent id="mobile-navigation" side="right" className="w-80 border-border bg-background">
            <SheetHeader>
              <SheetTitle className="font-display text-2xl">Oxford Finance Hub</SheetTitle>
              <SheetDescription>Finance arranged by Oxford Business Group</SheetDescription>
            </SheetHeader>
            <nav aria-label="Mobile" className="flex flex-col gap-1 px-4">
              {primaryNav.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setMobileMenuOpen(false)} className="border-b border-border/60 py-3 text-base hover:text-gold">
                  {item.label}
                </Link>
              ))}
              {authenticated ? (
                <>
                  {workspace && (
                    <Link to={workspace.to} onClick={() => setMobileMenuOpen(false)} className="border-b border-border/60 py-3 text-base hover:text-gold">
                      {workspace.label}
                    </Link>
                  )}
                  <Button type="button" variant="outline" className="mt-3" disabled={signingOut} onClick={handleSignOut}>
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </Button>
                </>
              ) : (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="border-b border-border/60 py-3 text-base hover:text-gold">
                  Sign in
                </Link>
              )}
              <Button asChild className="mt-6" size="lg">
                <Link to="/apply" onClick={() => setMobileMenuOpen(false)}>Applications paused</Link>
              </Button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
