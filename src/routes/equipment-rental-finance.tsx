import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/site/PageHero'
import { SiteLayout } from '@/components/site/SiteLayout'
import { intermediaryDisclaimer } from '@/lib/finance-config'

export const Route = createFileRoute('/equipment-rental-finance')({
  head: () => ({
    meta: [
      { title: 'Equipment Rental Finance South Africa | Oxford Finance Hub' },
      { name: 'description', content: 'Explore equipment rental finance enquiries in South Africa for machinery and productive business assets. Compare rental structures and prepare your business asset brief.' },
      { property: 'og:title', content: 'Equipment Rental Finance South Africa | Oxford Finance Hub' },
      { property: 'og:description', content: 'Discuss provider-arranged equipment rental and finance structures for productive assets across South Africa.' },
    ],
  }),
  component: EquipmentRentalFinancePage,
})

const preparation = [
  'The equipment category, specification, supplier and intended business use',
  'The estimated asset value and supplier quotation, if available',
  'The required rental period and expected delivery date',
  'Whether maintenance, insurance, servicing or end-of-term options are required',
  'The business profile, operating location and existing asset commitments',
]

function EquipmentRentalFinancePage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Equipment access · Rental finance"
        title="Equipment rental finance for business."
        intro="Explore structured rental and provider-arranged options for machinery, plant and other productive business assets, while understanding the payment obligations and end-of-term conditions."
        image="solutions-hero.jpg"
      />
      <div className="mx-auto max-w-content space-y-16 px-4 py-20 sm:px-6">
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <p className="eyebrow">Equipment access across South Africa</p>
            <h2 className="text-4xl font-medium">A rental structure shaped around the <span className="text-gold-gradient italic">asset and business.</span></h2>
            <p className="leading-relaxed text-muted-foreground">Equipment rental finance is a broad description for arrangements that allow a business to access equipment through rentals or provider-arranged structures instead of buying the asset outright. Depending on the provider and contract, an arrangement may be a rental, operating lease, finance lease or another structure. These terms are not interchangeable.</p>
            <p className="leading-relaxed text-muted-foreground">The agreement determines who owns the asset, who carries maintenance and insurance responsibilities, what happens if the equipment is damaged or returned, and whether any end-of-term purchase option exists. Oxford Business Group facilitates enquiries and is not itself the lender, lessor or equipment owner.</p>
          </div>
          <aside className="rounded-sm border border-border bg-card p-7">
            <h2 className="text-2xl">Information that helps</h2>
            <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
              {preparation.map((item) => <li key={item} className="flex gap-3"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold" />{item}</li>)}
            </ul>
          </aside>
        </section>
        <section className="space-y-5">
          <p className="eyebrow">Compare the arrangements</p>
          <h2 className="text-3xl font-medium">Rental finance and rent-to-own are not automatically the same.</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-sm border border-border p-6">
              <h3 className="text-xl">Equipment rental finance</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">The business pays to use the equipment under the agreed rental or lease structure. The agreement may require the asset to be returned at the end, or it may specify other options. Ownership is not assumed.</p>
              <Link to="/equipment-rental-finance" className="mt-4 inline-flex items-center gap-2 text-sm text-gold">Explore rental finance <ArrowRight className="size-4" /></Link>
            </article>
            <article className="rounded-sm border border-border p-6">
              <h3 className="text-xl">Rent-to-own equipment</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">A rent-to-own agreement must expressly describe the ownership option or pathway, including any conditions or final payment. Rental payments alone do not establish ownership.</p>
              <Link to="/rent-to-own" className="mt-4 inline-flex items-center gap-2 text-sm text-gold">Explore rent-to-own <ArrowRight className="size-4" /></Link>
            </article>
          </div>
        </section>
        <section className="space-y-5">
          <p className="eyebrow">Frequently asked questions</p>
          <h2 className="text-3xl font-medium">Equipment rental finance FAQs.</h2>
          {[
            ['What is equipment rental finance?', 'It is a broad description for provider-arranged ways to access equipment through rental or lease payments. The actual contract defines the legal and financial structure.'],
            ['Is equipment rental finance the same as rent-to-own?', 'No. A rental or lease does not automatically include an ownership option. Any right to purchase or transfer of ownership must be clearly stated in the signed agreement.'],
            ['What equipment can I enquire about?', 'Potential enquiries may involve earthmoving and construction machinery, agricultural equipment, medical and technical equipment, office equipment and other productive business assets. The provider confirms eligible assets.'],
            ['Are enquiries accepted nationally?', 'Yes. Oxford Finance Hub welcomes enquiries from across South Africa. Supplier participation, provider coverage, delivery and asset eligibility are checked for the specific location and requirement.'],
            ['Does an enquiry guarantee finance?', 'No. Oxford Business Group facilitates enquiries and is not the lender or lessor. Any arrangement is subject to provider criteria, affordability and credit assessment where applicable, supporting information and final contract terms.'],
          ].map(([question, answer]) => (
            <details key={question} className="rounded-sm border border-border p-5">
              <summary className="cursor-pointer font-medium">{question}</summary>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{answer}</p>
            </details>
          ))}
        </section>
        <section className="rounded-sm border border-border bg-card p-8 sm:p-10">
          <p className="eyebrow">Start with a conversation</p>
          <h2 className="mt-3 text-3xl font-medium">Tell us about the equipment you need.</h2>
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
