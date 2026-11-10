import { createFileRoute, Link } from '@tanstack/react-router'
import { BarChart3, Link2, ShieldCheck, Users } from 'lucide-react'
import { EnquiryForm } from '@/components/site/EnquiryForm'
import { PageHero } from '@/components/site/PageHero'
import { SiteLayout } from '@/components/site/SiteLayout'

export const Route = createFileRoute('/partners')({
  head: () => ({ meta: [{ title: 'For partners | Oxford Finance Hub' }] }),
  component: PartnersPage,
})

const benefits = [
  { icon: Link2, title: 'Personal referral link', body: 'Approved partners receive a unique link. Clients who apply through it are attributed to you automatically, and the code cannot be edited by the applicant.' },
  { icon: BarChart3, title: 'Referral reporting', body: 'Follow how many of your introductions start, submit and progress through provider assessment.' },
  { icon: Users, title: 'Dedicated office contact', body: 'A named Oxford consultant supports your clients through the application.' },
  { icon: ShieldCheck, title: 'Client privacy respected', body: 'Partners see progress information only — never your clients’ personal documents.' },
]

function PartnersPage() {
  return (
    <SiteLayout>
      <PageHero eyebrow="For partners" title="Partner with Oxford." image="vehicle.png"
        intro="For dealerships, equipment suppliers, accountants and advisers who want a trusted finance intermediary for their clients." />
      <div className="mx-auto grid max-w-content gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-8">
          {benefits.map((b) => (
            <div key={b.title} className="flex gap-4">
              <b.icon className="mt-1 size-5 shrink-0 text-gold" aria-hidden="true" />
              <div><h2 className="text-2xl">{b.title}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{b.body}</p></div>
            </div>
          ))}
          <div className="rounded-sm border border-border p-5 text-sm text-muted-foreground">
            Partner registrations are reviewed by the Oxford office. Referral links are issued only after approval.
          </div>
        </div>
        <div className="space-y-3">
          <div className="rounded-sm border border-gold/30 bg-card p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Link your partner account</p>
            <p className="mt-1">Please <Link to="/login" className="text-gold underline underline-offset-4">sign in or create an account</Link> before submitting this registration. This securely links the application to your account so the Oxford office can activate your referral portal after approval.</p>
          </div>
          <EnquiryForm kind="partner" title="Register as a partner" submitLabel="Submit registration"
          extraFields={[
            { id: 'organisation', label: 'Organisation', required: true },
            { id: 'type', label: 'Partner type', required: true, options: ['Vehicle dealership', 'Equipment supplier', 'Accountant / adviser', 'Broker', 'Other'] },
          ]} />
        </div>
      </div>
    </SiteLayout>
  )
}
