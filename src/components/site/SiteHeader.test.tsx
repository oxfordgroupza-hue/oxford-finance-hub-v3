import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@netlify/identity', () => ({
  logout: vi.fn(),
}))
vi.mock('@/lib/auth', () => ({
  getAuthorizationSnapshot: vi.fn(),
  logoutWithIdentity: vi.fn(),
}))
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}))

import { getAuthorizationSnapshot } from '@/lib/auth'
import { SiteHeader } from './SiteHeader'

describe('mobile site navigation', () => {
  it('opens from the menu button and closes after choosing a destination', async () => {
    const root = createRootRoute({
      component: () => (
        <>
          <SiteHeader />
          <Outlet />
        </>
      ),
    })
    const pages = [
      ['/', 'Home'],
      ['/solutions', 'Solutions page'],
      ['/partners', 'Partners page'],
      ['/about', 'About page'],
      ['/contact', 'Contact page'],
      ['/login', 'Sign in page'],
      ['/apply', 'Application page'],
    ] as const
    const routes = pages.map(([path, label]) =>
      createRoute({
        getParentRoute: () => root,
        path,
        component: () => <h1>{label}</h1>,
      }),
    )
    const router = createRouter({
      routeTree: root.addChildren(routes),
      history: createMemoryHistory({ initialEntries: ['/'] }),
      scrollRestoration: false,
    })
    await router.load()
    render(<RouterProvider router={router} />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Open menu' }))

    expect(await screen.findByRole('dialog')).toBeVisible()
    expect(screen.getByRole('navigation', { name: 'Mobile' })).toBeVisible()

    await user.click(screen.getByRole('link', { name: 'Finance solutions' }))
    expect(await screen.findByRole('heading', { name: 'Solutions page' })).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('uses the server-managed session to show authenticated workspace controls', async () => {
    vi.mocked(getAuthorizationSnapshot).mockResolvedValue({
      authenticated: true,
      provisioned: true,
      blocked: null,
      user: { id: 'office-user-1', email: 'admin@example.com', displayName: 'Oxford Admin', accountType: 'office', status: 'active' },
      permissions: ['office.view'],
      isSuperAdmin: true,
    })
    const root = createRootRoute({ component: () => <SiteHeader /> })
    const router = createRouter({
      routeTree: root,
      history: createMemoryHistory({ initialEntries: ['/'] }),
      scrollRestoration: false,
    })
    await router.load()
    render(<RouterProvider router={router} />)

    expect(await screen.findByRole('button', { name: 'Sign out' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Administration' })).toBeVisible()
  })
})
