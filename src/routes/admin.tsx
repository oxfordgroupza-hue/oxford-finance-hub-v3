import { createFileRoute, Link, Outlet, redirect, useRouterState } from '@tanstack/react-router'
import { Activity, ArrowLeft, Database, LockKeyhole, ShieldCheck, Users, Workflow } from 'lucide-react'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { permissionCatalogue, roleTemplates } from '@/lib/access-control'
import { WorkspaceSignOutButton } from '@/components/site/WorkspaceSignOutButton'

export const Route = createFileRoute('/admin')({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked) {
      throw redirect({ to: '/login' })
    }
    if (!session.isSuperAdmin) {
      throw redirect({ to: session.user.accountType === 'office' ? '/office' : '/dashboard' })
    }
  },
  loader: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked || !session.isSuperAdmin) {
      throw redirect({ to: '/login' })
    }
    return session
  },
  head: () => ({ meta: [{ title: 'Super Administrator | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: SuperAdministratorDashboard,
})

const panels = [
  {
    title: 'User administration',
    description: 'Manage staff accounts, account status, role assignments and individual permission overrides.',
    icon: Users,
    state: 'Live user and role controls are available',
  },
  {
    title: 'Security & audit',
    description: 'Review permission changes, account suspensions and security-sensitive administrative activity.',
    icon: LockKeyhole,
    state: 'Append-only audit trail and live viewer available in Office Operations',
  },
  {
    title: 'Office operations',
    description: 'Access the application register, partner operations and customer support workflows.',
    icon: Activity,
    state: 'Live application, partner and support registers are available',
  },
  {
    title: 'Database & integrations',
    description: 'Monitor database readiness and configure document storage, email and other integrations.',
    icon: Database,
    state: 'Database and external integrations require environment-specific verification',
  },
]

function SuperAdministratorDashboard() {
  const session = Route.useLoaderData()
  const isDeployPreview = process.env.CONTEXT === 'deploy-preview'
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/asset-catalogue') || pathname.startsWith('/admin/partner-permissions') || pathname.startsWith('/admin/settlements')) return <Outlet />
  const displayName = session.user.displayName?.trim() || session.user.email

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <header className="border-b border-white/10 bg-[#101010]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#c7a45a]">Oxford Business Group</p>
            <p className="mt-1 font-serif text-2xl">Finance Hub Administration</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-[#d8bd7c]">
              <ArrowLeft className="size-4" /> Public website
            </Link>
            <WorkspaceSignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-10 sm:px-8">
        <section className="rounded-xl border border-[#c7a45a]/35 bg-gradient-to-br from-[#1b1914] to-[#101010] p-6 sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#c7a45a]/40 bg-[#c7a45a]/10 px-3 py-1 text-xs font-semibold text-[#e5cc91]">
                <ShieldCheck className="size-4" /> Super Administrator
              </div>
              <h1 className="mt-5 font-serif text-4xl sm:text-5xl">Administration overview</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">
                You are signed in with the reserved Super Administrator role. This console reads your authenticated account and effective permissions from the server.
              </p>
            </div>
            <div className="min-w-64 rounded-lg border border-white/10 bg-black/25 p-5">
              <p className="text-xs uppercase tracking-widest text-white/45">Signed-in administrator</p>
              <p className="mt-2 font-medium">{displayName}</p>
              <p className="mt-1 break-all text-sm text-white/60">{session.user.email}</p>
              <p className="mt-3 text-xs text-[#d8bd7c]">Account status: {session.user.status}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Account type" value={session.user.accountType} note="Verified server-side" />
          <Metric label="Effective permissions" value={session.permissions.length} note="Granted to this account" />
          <Metric label="System role templates" value={roleTemplates.length} note="Defined access profiles" />
          <Metric label="Permission catalogue" value={permissionCatalogue.length} note="Available permission keys" />
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <Link to="/admin/users" className="rounded-lg border border-[#c7a45a]/30 bg-[#15130f] p-5 transition hover:border-[#c7a45a]/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c7a45a]">Super Admin</p>
            <h2 className="mt-2 font-serif text-2xl">Manage users & roles</h2>
            <p className="mt-2 text-sm text-white/55">Assign and revoke roles, suspend or reinstate accounts, and inspect the permission catalogue.</p>
          </Link>
          {isDeployPreview && <Link to="/demo" className="rounded-lg border border-[#c7a45a]/30 bg-[#15130f] p-5 transition hover:border-[#c7a45a]/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c7a45a]">Deploy Preview · Fictional data</p>
            <h2 className="mt-2 font-serif text-2xl">Explore all seven roles</h2>
            <p className="mt-2 text-sm text-white/55">Switch between Super Admin, office, reviewer, support, customer and partner demo personas. Simulate their daily actions without changing live records.</p>
          </Link>}
          <Link to="/office" className="rounded-lg border border-white/10 bg-[#121212] p-5 transition hover:border-[#c7a45a]/50">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c7a45a]">Office workspace</p>
            <h2 className="mt-2 font-serif text-2xl">Open operations</h2>
            <p className="mt-2 text-sm text-white/55">Review live applications, assignments, partner registrations, support requests and audit events.</p>
          </Link>
          <Link to="/admin/asset-catalogue" className="rounded-lg border border-[#c7a45a]/30 bg-[#15130f] p-5 transition hover:border-[#c7a45a]/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c7a45a]">Super Admin</p>
            <h2 className="mt-2 font-serif text-2xl">Industry & asset catalogue</h2>
            <p className="mt-2 text-sm text-white/55">Maintain the industry, category and equipment dropdown options shown in finance applications.</p>
          </Link>
          <Link to="/admin/partner-permissions" className="rounded-lg border border-[#c7a45a]/30 bg-[#15130f] p-5 transition hover:border-[#c7a45a]/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c7a45a]">Super Admin</p>
            <h2 className="mt-2 font-serif text-2xl">Partner document permissions</h2>
            <p className="mt-2 text-sm text-white/55">Enable or disable supporting-document uploads separately for each approved merchant partner.</p>
          </Link>
          <Link to="/admin/settlements" className="rounded-lg border border-[#c7a45a]/30 bg-[#15130f] p-5 transition hover:border-[#c7a45a]/70">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c7a45a]">Office finance control</p>
            <h2 className="mt-2 font-serif text-2xl">Confirmed settlements</h2>
            <p className="mt-2 text-sm text-white/55">Record actual funder receipts, preserve fee-term snapshots and review the full Oxford settlement breakdown.</p>
          </Link>
          <a href="/office/catalogue" className="rounded-lg border border-white/10 bg-[#121212] p-5 transition hover:border-[#c7a45a]/50">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c7a45a]">Office workspace</p>
            <h2 className="mt-2 font-serif text-2xl">Finance products & site content</h2>
            <p className="mt-2 text-sm text-white/55">Edit broad finance product descriptions and approved public website copy.</p>
          </a>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c7a45a]">Control centre</p>
              <h2 className="mt-2 font-serif text-3xl">Administration modules</h2>
            </div>
            {isDeployPreview && <span className="hidden items-center gap-2 text-xs text-white/45 sm:inline-flex"><Workflow className="size-4" /> Preview environment</span>}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {panels.map((panel) => {
              const Icon = panel.icon
              return (
                <article key={panel.title} className="rounded-lg border border-white/10 bg-[#121212] p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-md border border-[#c7a45a]/25 bg-[#c7a45a]/10 p-3 text-[#d8bd7c]"><Icon className="size-5" /></div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold">{panel.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-white/55">{panel.description}</p>
                      <p className="mt-4 border-t border-white/10 pt-3 text-xs leading-5 text-[#d8bd7c]">{panel.state}</p>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#121212] p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="size-5 text-[#c7a45a]" />
            <h2 className="font-serif text-2xl">Access control foundation</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-white/55">
            The reserved Super Administrator role is evaluated on the server. Customer accounts cannot receive office permissions, and public registration cannot grant administrator access.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roleTemplates.map((role) => (
              <div key={role.key} className="rounded-md border border-white/10 bg-black/20 p-4">
                <p className="font-medium">{role.name}</p>
                <p className="mt-1 text-xs text-white/45">{role.audience} account</p>
                <p className="mt-3 text-xs leading-5 text-white/60">{role.description}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="border-t border-white/10 pt-5 text-xs leading-5 text-white/40">
          {isDeployPreview
            ? 'This is the authenticated Super Administrator landing page for the Deploy Preview. User and role controls, application operations and audit review are available in the linked workspaces. External email delivery and private document storage must pass environment-specific tests before live use. Production access and data have not been changed.'
            : 'This is the authenticated Super Administrator landing page. External email delivery and private document storage must be configured and verified before sensitive applicant information is accepted.'}
        </footer>
      </main>
    </div>
  )
}

function Metric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#121212] p-5">
      <p className="text-xs uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-3 font-serif text-3xl capitalize text-[#e1c783]">{value}</p>
      <p className="mt-1 text-xs text-white/40">{note}</p>
    </div>
  )
}
