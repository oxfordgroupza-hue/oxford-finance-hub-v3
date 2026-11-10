interface NetlifyIdentityUser {
  id: string
  email?: string
  token?: { access_token?: string }
}

interface NetlifyIdentityWidget {
  init(options?: Record<string, unknown>): void
  currentUser(): NetlifyIdentityUser | null
  open(tab?: 'login' | 'signup' | 'recovery'): void
  on(event: 'init' | 'login' | 'logout' | 'error', callback: (user?: NetlifyIdentityUser | null) => void): void
}

declare global {
  interface Window {
    netlifyIdentity?: NetlifyIdentityWidget
  }
}

export {}
