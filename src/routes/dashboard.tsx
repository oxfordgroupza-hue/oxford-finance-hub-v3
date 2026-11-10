import { createFileRoute, redirect } from '@tanstack/react-router'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { getMyFinanceApplications, getMyFinanceDrafts } from '@/lib/application-actions'
import { getMySupportRequests } from '@/lib/support-actions'
import { CustomerDashboard } from '@/components/customer/CustomerDashboard'
import { SiteLayout } from '@/components/site/SiteLayout'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked) {
      throw redirect({ to: '/login' })
    }
    if (session.isSuperAdmin) throw redirect({ to: '/admin' })
    if (session.user.accountType === 'office' && session.permissions.includes('office.view')) {
      throw redirect({ to: '/office' })
    }
    if (session.user.accountType !== 'customer' || !session.permissions.includes('own_applications.view')) {
      throw redirect({ to: '/login' })
    }
  },
  loader: async () => {
    const [applications, drafts, supportRequests] = await Promise.all([getMyFinanceApplications(), getMyFinanceDrafts(), getMySupportRequests()])
    return { applications, drafts, supportRequests }
  },
  head: () => ({ meta: [{ title: 'My dashboard | Oxford Finance Hub' }] }),
  component: CustomerDashboardPage,
})

function CustomerDashboardPage() {
  const { applications, drafts, supportRequests } = Route.useLoaderData()
  return (
    <SiteLayout>
      <div className="mx-auto max-w-content px-4 py-14 sm:px-6">
        <CustomerDashboard applications={applications} drafts={drafts} supportRequests={supportRequests} />
      </div>
    </SiteLayout>
  )
}
