import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { handleAuthCallback } from '@netlify/identity'
import { useEffect } from 'react'
import { getAuthorizationSnapshot } from '@/lib/auth'

import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { NotFoundPage } from '@/components/error-pages'

import '../styles.css'

const siteName = 'Oxford Finance Hub | Oxford Business Group'
const siteDescription = 'Vehicle, equipment, commercial asset and specialised finance for individuals and businesses, arranged by Oxford Business Group, a finance intermediary.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Manrope:wght@400;500;600;700&display=swap',
      },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <AuthCallbackHandler />
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <Scripts />
      </body>
    </html>
  )
}


/** Complete Identity confirmation, recovery and invitation callbacks on any landing route. */
function AuthCallbackHandler() {
  useEffect(() => {
    let active = true
    void (async () => {
      try {
        if (window.location.pathname === '/login') return
        const result = await handleAuthCallback()
        if (!active || !result) return
        if (result.type === 'invite' && result.token) {
          window.location.replace(`/login#invite_token=${encodeURIComponent(result.token)}`)
        } else if (result.type === 'recovery') {
          window.location.replace('/login?reset=1')
        } else if (result.user) {
          const session = await getAuthorizationSnapshot()
          if (!active) return
          const destination = session.authenticated && session.provisioned && !session.blocked
            ? session.isSuperAdmin ? '/admin'
              : session.user.accountType === 'office' && session.permissions.includes('office.view') ? '/office'
                : session.user.accountType === 'partner' && session.permissions.includes('partner_referrals.view') ? '/partner'
                  : '/dashboard'
            : '/login'
          window.location.replace(destination)
        }
      } catch {
        // The login route owns user-facing authentication errors.
      }
    })()
    return () => { active = false }
  }, [])

  return null
}
