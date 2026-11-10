import { createFileRoute, Outlet, redirect, useRouterState } from '@tanstack/react-router'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { getOfficeWorkspaceData } from '@/lib/office-actions'
import { OfficeWorkspaceLive } from '@/components/office/OfficeWorkspaceLive'

export const Route = createFileRoute('/office')({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked) {
      throw redirect({ to: '/login' })
    }
    if (session.user.accountType !== 'office' || !session.permissions.includes('office.view')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  loader: async () => ({ data: await getOfficeWorkspaceData() }),
  head: () => ({ meta: [{ title: 'Office workspace | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: OfficePage,
})

function OfficePage() {
  const { data } = Route.useLoaderData()
  const pathname = useRouterState({ select: (state) => state.location.pathname })

  // /office/catalogue is a file-based child route. Render its outlet instead
  // of leaving the parent OfficeWorkspaceLive page mounted over the child.
  if (pathname.startsWith('/office/catalogue') || pathname.startsWith('/office/intakes') || pathname.startsWith('/office/credit-assessments')) return <Outlet />

  return <OfficeWorkspaceLive data={data} />
}
