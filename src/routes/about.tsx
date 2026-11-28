import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/site/PageHero'
import { SiteLayout } from '@/components/site/SiteLayout'
import { img } from '@/lib/images'

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About Oxford Finance Hub | Oxford Business Group' }] }),
  component: AboutPage,
})

const principles = [
  { title: 'Considered', body: 'We take time to understand your requirement and help prepare a clear application.' },
  { title: 'Transparent', body: 'We explain the process clearly. Each finance provider makes its own assessment and decision.' },
  { title: 'Discreet', body: 'Personal and financial information is handled carefully and shared only with consent.' },
]

function AboutPage() {
  return (
    <SiteLayout>
      <PageHero eyebrow="About us" title="Oxford Finance Hub" intro="A dedicated South African finance platform helping individuals and businesses explore vehicle, equipment and commercial asset finance options." />
      <section className="mx-auto grid max-w-content items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
        <img src={img('about.png', 1100)} alt="A contemporary glass-walled executive meeting room" loading="lazy" className="aspect-[4/3] w-full rounded-sm border border-border object-cover" />
        <div>
          <p className="eyebrow">Our role</p>
          <h2 className="mt-4 text-4xl font-medium">A clearer path to finance options.</h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            Oxford Finance Hub is the dedicated finance platform of Oxford Business Group. It brings the application process,
            office team and partner network together in one place, helping individuals and businesses prepare complete
            applications for consideration by relevant finance providers.
          </p>
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
