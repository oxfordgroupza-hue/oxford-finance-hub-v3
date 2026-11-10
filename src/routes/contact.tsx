import { createFileRoute, Link } from '@tanstack/react-router'
import { HelpCircle, MessageSquareWarning } from 'lucide-react'
import { EnquiryForm } from '@/components/site/EnquiryForm'
import { PageHero } from '@/components/site/PageHero'
import { SiteLayout } from '@/components/site/SiteLayout'

export const Route = createFileRoute('/contact')({
  head: () => ({ meta: [{ title: 'Contact | Oxford Finance Hub' }] }),
  component: ContactPage,
})

function ContactPage() {
  return (
    <SiteLayout>
      <PageHero eyebrow="Contact" title="Speak to Oxford." intro="Send us a general enquiry and a member of our office will respond. For a finance application, please use the secure application journey." />
      <div className="mx-auto grid max-w-content gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_1fr]">
        <EnquiryForm kind="contact" title="General enquiry"
          extraFields={[{ id: 'topic', label: 'Topic', options: ['Finance options', 'An existing application', 'Partnerships', 'Media', 'Other'] }]} />
        <div className="space-y-4">
          <Link to="/support" className="flex gap-4 rounded-sm border border-border bg-card p-6 hover:border-gold/50">
            <HelpCircle className="size-5 shrink-0 text-gold" /><div><h2 className="text-2xl">Support</h2><p className="mt-1 text-sm text-muted-foreground">Help with the website, your dashboard or an application in progress.</p></div>
          </Link>
          <Link to="/complaints" className="flex gap-4 rounded-sm border border-border bg-card p-6 hover:border-gold/50">
            <MessageSquareWarning className="size-5 shrink-0 text-gold" /><div><h2 className="text-2xl">Complaints</h2><p className="mt-1 text-sm text-muted-foreground">How to raise a complaint and what to expect from us.</p></div>
          </Link>
          <p className="rounded-sm border border-border p-5 text-sm text-muted-foreground">Office telephone, email and address details will be published here once confirmed by Oxford Business Group.</p>
        </div>
      </div>
    </SiteLayout>
  )
}
