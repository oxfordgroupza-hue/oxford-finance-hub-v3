import { useState } from 'react'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { createStaffInvitation, getStaffInvitationRoles } from '@/lib/staff-invitation-actions'
import { WorkspaceSignOutButton } from '@/components/site/WorkspaceSignOutButton'

export const Route = createFileRoute('/admin/staff-invitations')({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked || !session.isSuperAdmin) {
      throw redirect({ to: '/login' })
    }
  },
  loader: () => getStaffInvitationRoles(),
  head: () => ({ meta: [{ title: 'Staff invitations | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: StaffInvitationsPage,
})

function StaffInvitationsPage() {
  const roles = Route.useLoaderData()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [roleId, setRoleId] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async () => {
    if (!email.trim() || !fullName.trim() || !roleId) {
      toast.error('Enter the staff member details and choose a role.')
      return
    }
    setBusy(true)
    setSent(false)
    try {
      const result = await createStaffInvitation({ data: { email, fullName, roleId } })
      setSent(true)
      toast.success('Staff invitation sent.')
      setEmail('')
      setFullName('')
      setRoleId('')
      return result
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The staff invitation could not be sent.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <header className="border-b border-white/10 bg-[#101010]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-[#c7a45a]">Oxford Business Group</p>
            <h1 className="mt-1 font-serif text-3xl">Staff invitations</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin/users" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-[#d8bd7c]"><ArrowLeft className="size-4" /> User administration</Link>
            <WorkspaceSignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8 sm:px-8">
        <section className="rounded-lg border border-[#c7a45a]/25 bg-[#171510] p-5">
          <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-[#d8bd7c]" /><h2 className="font-serif text-2xl">Invite an office team member</h2></div>
          <p className="mt-2 text-sm leading-6 text-white/60">The invitation creates a pending office account and assigns the selected least-privilege role. The recipient creates their own password through a single-use, 72-hour activation link. Super Administrator access cannot be granted through this workflow.</p>
        </section>
        <section className="max-w-2xl rounded-lg border border-white/10 bg-[#121212] p-6">
          <div className="grid gap-4">
            <label className="grid gap-2 text-sm text-white/70">Full name
              <Input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Staff member full name" className="bg-black/30" />
            </label>
            <label className="grid gap-2 text-sm text-white/70">Work email
              <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@company.co.za" className="bg-black/30" />
            </label>
            <label className="grid gap-2 text-sm text-white/70">Staff role
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger className="bg-black/30"><SelectValue placeholder="Choose a staff role" /></SelectTrigger>
                <SelectContent>{roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent>
              </Select>
            </label>
            <Button disabled={busy || roles.length === 0} onClick={() => void submit()}>
              <Mail className="size-4" /> {busy ? 'Sending invitation…' : 'Send staff invitation'}
            </Button>
            {roles.length === 0 && <p className="text-sm text-amber-200">No active non-reserved office roles are available. Activate or configure a staff role first.</p>}
            {sent && <p role="status" className="text-sm text-emerald-300">The invitation was sent. The staff member must activate the account and create a password before signing in.</p>}
          </div>
        </section>
      </main>
    </div>
  )
}
