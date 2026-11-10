import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/site/PageHero'
import { SiteLayout } from '@/components/site/SiteLayout'
import { intermediaryDisclaimer } from '@/lib/finance-config'
import { img } from '@/lib/images'

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About us | Oxford Business Group' }] }),
  component: AboutPage,
})

const principles = [
  { title: 'Considered', body: 'We take time to understand the requirement before presenting it to a provider.' },
  { title: 'Transparent', body: 'We are an intermediary, and we say so. Decisions rest with the finance provider.' },
  { title: 'Discreet', body: 'Personal and financial information is handled carefully and shared only with consent.' },
]

function AboutPage() {
  return (
    <SiteLayout>
      <PageHero eyebrow="About us" title="Oxford Business Group" intro="A South African finance intermediary helping individuals and businesses access vehicle, equipment and commercial asset finance." />
      <section className="mx-auto grid max-w-content items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <img src={img('about.png', 1100)} alt="A dark boardroom with city views at dusk" loading="lazy" className="aspect-[4/3] w-full rounded-sm border border-border object-cover" />
        <div>
          <p className="eyebrow">Our role</p>
          <h2 className="mt-4 text-4xl font-medium">Between you and the right finance provider.</h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Oxford Finance Hub is Oxford Business Group’s digital front door. It brings our application process, our office
            team and our partner network together in one place, so that every application arrives with a provider complete,
            well presented and ready for assessment.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{intermediaryDisclaimer}</p>
          <Button asChild variant="gold" className="mt-8 rounded-sm"><Link to="/contact">Speak to our team</Link></Button>
        </div>
      </section>
      <section className="border-t border-border bg-charcoal/40">
        <div className="mx-auto grid max-w-content gap-10 px-4 py-20 sm:px-6 md:grid-cols-3">
          {principles.map((p) => (
            <div key={p.title} className="border-t border-gold/40 pt-6"><h3 className="text-3xl">{p.title}</h3><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.body}</p></div>
          ))}
        </div>
      </section>
    </SiteLayout>
  )
}
