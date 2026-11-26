import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/site/PageHero'
import { SiteLayout } from '@/components/site/SiteLayout'
import { intermediaryDisclaimer } from '@/lib/finance-config'

export const Route = createFileRoute('/rent-to-own')({
  head: () => ({
    meta: [
      { title: 'Rent-to-Own Equipment South Africa | Oxford Finance Hub' },
      { name: 'description', content: 'Explore rent-to-own equipment enquiries in South Africa. Understand supplier arrangements, ownership options and the information needed to discuss a business asset.' },
      { property: 'og:title', content: 'Rent-to-Own Equipment South Africa | Oxford Finance Hub' },
      { property: 'og:description', content: 'Explore supplier- or provider-arranged rent-to-own options for productive business equipment across South Africa.' },
    ],
  }),
  component: RentToOwnPage,
})

const considerations = [
  'The equipment type, make, model, condition and intended business use',
  'The supplier quotation and whether the asset is new or pre-owned',
  'Whether the written agreement expressly includes an option or pathway to ownership',
  'The proposed rental period, deposit and payment frequency, if known',
  'Maintenance, insurance, delivery and end-of-term responsibilities',
]

function RentToOwnPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Equipment access · Rent-to-own"
        title="Rent-to-own equipment for business."
        intro="Explore supplier- or finance-provider-arranged ways to access productive equipment through scheduled rental payments, with an ownership option only where the written agreement specifically provides for one."
        image="solutions-hero.jpg"
      />
      <div className="mx-auto max-w-content space-y-16 px-4 py-20 sm:px-6">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <p className="eyebrow">A considered route to equipment access</p>
            <h2 className="text-4xl font-medium">Use the asset. Understand the <span className="text-gold-gradient italic">agreement.</span></h2>
            <p className="leading-relaxed text-muted-foreground">Rent-to-own may suit a business that needs equipment for its operations but wants to consider a structured rental arrangement rather than an outright purchase. The exact arrangement is determined by the supplier or finance provider and the signed contract.</p>
            <p className="leading-relaxed text-muted-foreground">Not every rental includes an ownership option. Any purchase option, transfer of ownership, final payment, deposit, maintenance obligation and early termination condition must be expressly set out in the agreement. Oxford Business Group facilitates enquiries; it is not the lender or equipment owner.</p>
          </div>
          <aside className="rounded-sm border border-border bg-card p-7">
            <h2 className="text-2xl">What to prepare</h2>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              {considerations.map((item) => <li key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" />{item}</li>)}
            </ul>
          </aside>
        </section>
        <section className="space-y-5">
          <p className="eyebrow">Understand the structure</p>
          <h2 className="text-3xl font-medium">Questions to ask before entering an agreement.</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['Is ownership included?', 'Confirm whether the contract includes an option to purchase, an automatic transfer, or simply requires the equipment to be returned. Do not assume ownership follows from making rental payments.'],
              ['What is the total cost?', 'Ask for the complete payment schedule, any deposit, fees, final or balloon amount, and the cost of exercising an ownership option if one exists.'],
              ['Who is responsible for the asset?', 'Clarify servicing, repairs, insurance, damage, downtime, delivery and collection responsibilities throughout the agreement.'],
              ['What happens at the end?', 'Get the end-of-term choices in writing, including return conditions, extension options and any purchase process or final amount.'],
            ].map(([title, body]) => (
              <article key={title} className="rounded-sm border border-border p-6">
                <h3 className="text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="space-y-5">
          <p className="eyebrow">Frequently asked questions</p>
          <h2 className="text-3xl font-medium">Rent-to-own equipment FAQs.</h2>
          {[
            ['What does rent-to-own equipment mean?', 'It describes an arrangement where equipment is rented and the agreement may provide an option or pathway to ownership. The contract must state the actual ownership terms; a standard rental does not automatically become rent-to-own.'],
            ['Which equipment can be considered?', 'Potential enquiries may include machinery, construction and earthmoving equipment, agricultural assets, medical or technical equipment, and other productive business assets. Eligibility depends on the supplier or provider.'],
            ['Can I enquire from anywhere in South Africa?', 'Yes. Oxford Finance Hub welcomes enquiries from across South Africa. Supplier participation, asset eligibility, delivery and provider coverage are checked for the specific location and requirement.'],
            ['Does Oxford Business Group approve the agreement?', 'No. Oxford Business Group is a finance intermediary and facilitator, not a lender or equipment owner. The relevant supplier or finance provider determines eligibility, affordability checks, terms and final acceptance.'],
          ].map(([question, answer]) => (
            <details key={question} className="rounded-sm border border-border p-5">
              <summary className="cursor-pointer font-medium">{question}</summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p>
            </details>
          ))}
        </section>
        <section className="rounded-sm border border-border bg-card p-8 sm:p-10">
          <p className="eyebrow">Start with a conversation</p>
          <h2 className="mt-3 text-3xl font-medium">Discuss your equipment requirement.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Online finance applications and private document uploads are currently paused while secure services are verified. You can send a non-sensitive enquiry to discuss the asset and possible provider options. Do not send identity documents, bank statements or other confidential information through a general enquiry.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="gold" className="rounded-sm"><Link to="/contact">Make a non-sensitive enquiry <ArrowRight /></Link></Button>
            <Button asChild variant="outlineGold" className="rounded-sm"><Link to="/solutions">Explore finance solutions</Link></Button>
          </div>
        </section>
        <p className="text-sm text-muted-foreground">{intermediaryDisclaimer}</p>
      </div>
    </SiteLayout>
  )
}
