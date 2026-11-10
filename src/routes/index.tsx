import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Briefcase, FileCheck2, Handshake, LayoutDashboard, ShieldCheck, User2, Waypoints } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SiteLayout } from '@/components/site/SiteLayout'
import { PreviewNotice } from '@/components/site/PreviewNotice'
import { applicantTypes, documentCollectionNotice, financeCategories, intermediaryDisclaimer } from '@/lib/finance-config'
import { img, imgSrcSet } from '@/lib/images'
import { getPublicSiteConfig } from '@/lib/catalog-actions'

export const Route = createFileRoute('/')({
  loader: () => getPublicSiteConfig(),
  component: Home,
})

const featureStrip = [
  { icon: Waypoints, title: 'Intermediary access', body: 'One application, presented to suitable finance providers.' },
  { icon: Briefcase, title: 'Individual & business', body: 'Dedicated journeys for private and commercial applicants.' },
  { icon: FileCheck2, title: 'Application status', body: 'Online applications are temporarily paused while secure services are verified.' },
  { icon: ShieldCheck, title: 'Private document handling', body: 'Private document collection is not yet enabled. Do not send sensitive documents by email or general enquiry forms.' },
]

const categorySlides: Record<string, { file: string; alt: string }[]> = {
  vehicle: [
    { file: 'vehicle-g63.jpg', alt: 'White Mercedes-Benz G 63 AMG' },
    { file: 'vehicle-mclaren.jpg', alt: 'Green McLaren 750S Spider featured in the supplied Car and Classic listing' },
  ],
  'commercial-asset': [
    { file: 'commercial.png', alt: 'Commercial asset finance' },
    { file: 'commercial-asset-added.jpg', alt: 'Commercial truck for asset finance' },
  ],
  equipment: [
    { file: 'equipment-solar.jpg', alt: 'Solar panels and wind turbines for renewable energy projects' },
    { file: 'equipment-grader.jpg', alt: 'Yellow Bell 670G motor grader' },
    { file: 'equipment-excavator.jpg', alt: 'Excavator at work on a construction site' },
    { file: 'equipment-dialysis.jpg', alt: 'Hemodialysis dialysis machine on a clean white background' },
    { file: 'equipment-dental.jpg', alt: 'Modern empty dental consultation room with a dental chair and no people' },
  ],
  other: [
    { file: 'other-villa.jpg', alt: 'Family-friendly Constantia villa' },
    { file: 'other-private-asset.jpg', alt: 'Private aviation and luxury asset' },
    { file: 'other-yacht.jpg', alt: 'Luxury yacht' },
    { file: 'other-helicopter.jpg', alt: 'Hill Helicopters aircraft' },
  ],
}

const steps = [
  { n: '01', title: 'Make an enquiry', body: 'Share a non-sensitive outline of the asset or finance requirement through the contact channel.' },
  { n: '02', title: 'Requirements review', body: 'Oxford will confirm the appropriate next steps once secure online applications reopen.' },
  { n: '03', title: 'Provider presentation', body: 'Where appropriate, an application pack can be prepared and presented to a suitable finance provider.' },
  { n: '04', title: 'Provider assessment', body: 'The relevant finance provider makes its own assessment and final decision.' },
]

function Home() {
  const publicConfig = Route.useLoaderData()
  const products = publicConfig.products
  const categories = products.length
    ? financeCategories.flatMap((category) => {
        const product = products.find((item) => item.category === category.id)
        if (product?.isActive === false) return []
        return [{ ...category, ...(product ? { name: product.name, description: product.description } : {}) }]
      })
    : financeCategories
  const content = publicConfig.content
  return (
    <SiteLayout overlayHeader>
      {/* Cinematic hero */}
      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden">
        <img
          src={img('hero.png', 1920, 80)}
          srcSet={imgSrcSet('hero.png', [768, 1280, 1920])}
          sizes="100vw"
          alt="A modern office tower at dusk with gold-lit vertical fins"
          className="absolute inset-0 z-0 size-full object-cover object-[50%_35%]"
          fetchPriority="high"
        />
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/55 to-black/30" />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/75 via-black/25 to-transparent" />
        <div className="relative z-20 mx-auto w-full max-w-content px-4 pt-36 pb-16 sm:px-6 md:pb-24">
          <p className="eyebrow fade-up">{content['home.hero.eyebrow'] || 'Oxford Business Group · Finance Intermediary'}</p>
          <h1 className="fade-up mt-6 max-w-4xl text-5xl leading-[0.98] font-medium sm:text-6xl md:text-[5.5rem]">
            Finance, arranged
            <br />
            <span className="text-gold-gradient italic">with intention.</span>
          </h1>
          <p className="fade-up mt-7 max-w-xl text-lg leading-relaxed text-foreground/80">
            {content['home.hero.intro'] || 'Vehicle, equipment and commercial asset finance for individuals and businesses — prepared with care and presented to the right finance providers.'}
          </p>
          <div className="fade-up mt-10 flex flex-col gap-3 sm:flex-row">
            <Button asChild variant="gold" size="xl">
              <Link to="/apply">
                Applications paused <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outlineGold" size="xl">
              <Link to="/partners">{content['home.hero.secondary_cta'] || 'Partner with Oxford'}</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-content px-4 pt-8 sm:px-6">
        <PreviewNotice>
          Online applications and private document uploads are temporarily unavailable while Oxford verifies its secure services. Do not submit real personal, identity, banking or financial information through this preview, general enquiry forms or email.
        </PreviewNotice>
      </div>

      {/* Four-part feature strip */}
      <section aria-label="Why Oxford" className="border-y border-border bg-charcoal/60">
        <div className="mx-auto grid max-w-content divide-border px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:divide-x">
          {featureStrip.map((f) => (
            <div key={f.title} className="flex gap-4 py-8 lg:px-8 lg:first:pl-0 lg:last:pr-0">
              <f.icon className="mt-1 size-5 shrink-0 text-gold" aria-hidden="true" />
              <div>
                <h2 className="font-sans text-sm font-semibold tracking-wide">{f.title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Finance categories */}
      <section className="mx-auto max-w-content px-4 py-24 sm:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow">Finance solutions</p>
            <h2 className="mt-4 max-w-2xl text-4xl font-medium md:text-5xl">Four categories. One considered service.</h2>
          </div>
          <Link to="/solutions" className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-soft">
            Explore all solutions <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/apply"
              search={{ category: c.id }}
              className="group relative flex min-h-[26rem] flex-col justify-end overflow-hidden bg-background p-6"
            >
              {categorySlides[c.id] ? (
                <div className="finance-category-carousel absolute inset-0 z-0 overflow-hidden" aria-label={`${c.name} image carousel`}>
                  {categorySlides[c.id].map((slide, index) => (
                    <img
                      key={slide.file}
                      src={img(slide.file, 960)}
                      alt={slide.alt}
                      loading="lazy"
                      className="finance-category-slide absolute inset-0 size-full object-cover"
                      style={{
                        animationDuration: `${categorySlides[c.id].length * 5}s`,
                        animationDelay: `-${index * 5}s`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <img
                  src={img(c.image, 640)}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  className="absolute inset-0 z-0 size-full object-cover opacity-60 transition-all duration-700 group-hover:scale-105 group-hover:opacity-80 motion-reduce:transition-none"
                />
              )}
              <div className="absolute inset-0 z-10 bg-gradient-to-t from-background via-background/65 to-transparent" />
              <div className="relative z-20">
                <c.icon className="size-6 text-gold" aria-hidden="true" />
                <h3 className="mt-4 text-2xl font-medium">{c.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.short}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-gold uppercase">
                  Applications paused <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Category imagery is illustrative. Product names and brands are shown for identification; availability and specifications are subject to supplier confirmation.
        </p>
      </section>

      {/* Applicant access cards */}
      <section className="border-y border-border bg-charcoal/40">
        <div className="mx-auto grid max-w-content gap-6 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1fr_1fr]">
          <div className="lg:pr-8">
            <p className="eyebrow">Enquiries</p>
            <h2 className="mt-4 text-4xl font-medium">Finance enquiries for individuals and businesses.</h2>
            <p className="mt-5 leading-relaxed text-muted-foreground">
              When secure online applications reopen, the journey will be tailored to your applicant type and finance category.
            </p>
          </div>
          {(['individual', 'business'] as const).map((t) => {
            const Icon = t === 'individual' ? User2 : Briefcase
            return (
              <Link
                key={t}
                to="/apply"
                search={{ type: t }}
                className="group flex flex-col justify-between rounded-sm border border-border bg-card p-8 transition-colors hover:border-gold/60"
              >
                <div>
                  <Icon className="size-7 text-gold" aria-hidden="true" />
                  <h3 className="mt-6 text-3xl font-medium">{applicantTypes[t].label} finance enquiry</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{applicantTypes[t].blurb}</p>
                </div>
                <span className="mt-10 inline-flex items-center gap-2 text-sm text-gold">
                  Applications paused
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-content px-4 py-24 sm:px-6">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-4 max-w-2xl text-4xl font-medium md:text-5xl">What happens when applications reopen.</h2>
        <ol className="mt-14 grid gap-10 md:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="border-t border-gold/40 pt-6">
              <span className="font-display text-4xl text-gold">{s.n}</span>
              <h3 className="mt-3 text-xl font-medium">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Dashboard + partners */}
      <section className="relative overflow-hidden border-t border-border">
        <img src={img('about.png', 1600, 60)} alt="" aria-hidden="true" loading="lazy" className="absolute inset-0 z-0 size-full object-cover opacity-40" />
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-background via-background/80 to-background/45" />
        <div className="relative z-20 mx-auto grid max-w-content gap-8 px-4 py-24 sm:px-6 md:grid-cols-2">
          <div className="rounded-sm border border-border bg-background/70 p-8 backdrop-blur">
            <LayoutDashboard className="size-6 text-gold" aria-hidden="true" />
            <h2 className="mt-5 text-3xl font-medium">Your customer dashboard</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Sign in to access your workspace. Online application submission is currently paused while secure services are verified.
            </p>
            <Button asChild variant="outlineGold" className="mt-8 rounded-sm">
              <Link to="/dashboard">Open my dashboard</Link>
            </Button>
          </div>
          <div className="rounded-sm border border-border bg-background/70 p-8 backdrop-blur">
            <Handshake className="size-6 text-gold" aria-hidden="true" />
            <h2 className="mt-5 text-3xl font-medium">For dealers, suppliers & advisers</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Register as an Oxford partner to receive a personal referral link and follow the progress of the
              clients you introduce.
            </p>
            <Button asChild variant="outlineGold" className="mt-8 rounded-sm">
              <Link to="/partners">Become a partner</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-content space-y-4 px-4 py-14 sm:px-6">
        <PreviewNotice>{documentCollectionNotice}</PreviewNotice>
        <p className="text-sm leading-relaxed text-muted-foreground">{intermediaryDisclaimer}</p>
      </section>
    </SiteLayout>
  )
}
