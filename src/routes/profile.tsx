import { useState, type FormEvent } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { SiteLayout } from '@/components/site/SiteLayout'
import { getAuthorizationSnapshot } from '@/lib/auth'
import { getCustomerProfile, updateCustomerProfile } from '@/lib/profile-actions'

export const Route = createFileRoute('/profile')({
  beforeLoad: async () => {
    const session = await getAuthorizationSnapshot()
    if (!session.authenticated || !session.provisioned || session.blocked) throw redirect({ to: '/login' })
    if ((session.user.accountType !== 'customer' && session.user.accountType !== 'partner') || !session.permissions.includes('own_profile.view')) {
      throw redirect({ to: '/dashboard' })
    }
  },
  loader: () => getCustomerProfile(),
  head: () => ({ meta: [{ title: 'Profile | Oxford Finance Hub' }, { name: 'robots', content: 'noindex' }] }),
  component: ProfilePage,
})

function ProfilePage() {
  const initial = Route.useLoaderData()
  const [p, setP] = useState(initial)
  const [pending, setPending] = useState(false)

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending || !p.canEdit) return
    setPending(true)
    try {
      const saved = await updateCustomerProfile({ data: {
        name: p.name,
        phone: p.phone,
        statusEmails: p.statusEmails,
        marketing: p.marketing,
        preferredContact: p.preferredContact,
      } })
      setP(saved)
      toast.success('Your profile and preferences have been saved.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Your profile could not be saved.')
    } finally {
      setPending(false)
    }
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-14 sm:px-6">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="mt-3 text-4xl font-medium md:text-5xl">Profile & preferences</h1>
          <p className="mt-3 text-sm text-muted-foreground">Keep your contact details and communication choices up to date.</p>
        </div>
        <form className="space-y-8 rounded-sm border border-border bg-card p-6 sm:p-8" onSubmit={save}>
          <fieldset className="grid gap-5 sm:grid-cols-2" disabled={!p.canEdit}>
            <legend className="mb-4 font-display text-2xl">Contact details</legend>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Full name</Label>
              <Input id="name" autoComplete="name" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Account email</Label>
              <Input id="email" type="email" value={p.email} readOnly aria-describedby="email-help" />
              <p id="email-help" className="text-xs text-muted-foreground">Your sign-in email is managed by account security settings.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Mobile</Label>
              <Input id="phone" type="tel" autoComplete="tel" value={p.phone} onChange={(e) => setP({ ...p, phone: e.target.value })} />
            </div>
          </fieldset>
          <fieldset className="space-y-5 border-t border-border pt-8" disabled={!p.canEdit}>
            <legend className="mb-4 font-display text-2xl">Communication</legend>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="statusEmails" className="font-normal">Email me when my application status changes</Label>
              <Switch id="statusEmails" checked={p.statusEmails} onCheckedChange={(v) => setP({ ...p, statusEmails: v })} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="marketing" className="font-normal">Occasional updates about Oxford finance solutions</Label>
              <Switch id="marketing" checked={p.marketing} onCheckedChange={(v) => setP({ ...p, marketing: v })} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="contact" className="font-normal">Preferred contact method</Label>
              <Select value={p.preferredContact} onValueChange={(v) => setP({ ...p, preferredContact: v as 'Email' | 'Phone' })}>
                <SelectTrigger id="contact" className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Email">Email</SelectItem><SelectItem value="Phone">Phone</SelectItem></SelectContent>
              </Select>
            </div>
          </fieldset>
          {!p.canEdit && <p className="text-xs text-muted-foreground">Your account has view-only access to profile settings.</p>}
          <Button type="submit" variant="gold" className="rounded-sm" disabled={pending || !p.canEdit}>
            {pending ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </div>
    </SiteLayout>
  )
}
