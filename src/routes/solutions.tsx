import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHero } from '@/components/site/PageHero'
import { SiteLayout } from '@/components/site/SiteLayout'
import { financeCategories, getDocumentChecklist, intermediaryDisclaimer } from '@/lib/finance-config'
import { img } from '@/lib/images'
import { getPublicSiteConfig } from '@/lib/catalog-actions'

export const Route = createFileRoute('/solutions')({
  loader: () => getPublicSiteConfig(),
  head: () => ({ meta: [{ title: 'Finance solutions | Oxford Finance Hub' }] }),
  component: SolutionsPage,
})

function SolutionsPage() {
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
    <SiteLayout>
      <PageHero eyebrow="Finance solutions" title={content['solutions.hero.title'] || 'Finance for the assets that move you forward.'}
        intro={content['solutions.hero.intro'] || 'Oxford Business Group prepares your application and presents it to suitable finance providers across four categories, for individuals and businesses alike.'}
        image="solutions-hero.jpg" />
      <div className="mx-auto max-w-content space-y-6 px-4 py-20 sm:px-6">
        {categories.map((c, i) => (
          <article key={c.id} id={c.id} className="grid scroll-mt-28 overflow-hidden rounded-sm border border-border bg-card lg:grid-cols-2">
            <img src={img(c.image, 960)} alt="" aria-hidden="true" loading="lazy" className={`h-64 w-full object-cover lg:h-full ${i % 2 ? 'lg:order-2' : ''}`} />
            <div className="p-8 sm:p-12">
              <c.icon className="size-6 text-gold" aria-hidden="true" />
              <h2 className="mt-4 text-4xl font-medium">{c.name}</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">{c.description}</p>
              <ul className="mt-6 space-y-2">
                {c.examples.map((e) => <li key={e} className="flex items-center gap-2 text-sm"><Check className="size-4 text-gold" />{e}</li>)}
              </ul>
              <details className="mt-6 rounded-sm border border-border p-4 text-sm">
                <summary className="cursor-pointer text-gold">Typical documents</summary>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  {(['individual', 'business'] as const).map((t) => (
                    <div key={t}>
                      <p className="mb-2 text-xs tracking-wide text-muted-foreground uppercase">{t}</p>
                      <ul className="space-y-1 text-foreground/80">{getDocumentChecklist(t, c.id).filter((d) => d.required).map((d) => <li key={d.id}>· {d.label}</li>)}</ul>
                    </div>
                  ))}
                </div>
              </details>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="gold" className="rounded-sm"><Link to="/apply" search={{ type: 'individual', category: c.id }}>Apply as individual</Link></Button>
                <Button asChild variant="outlineGold" className="rounded-sm"><Link to="/apply" search={{ type: 'business', category: c.id }}>Apply as business <ArrowRight /></Link></Button>
              </div>
            </div>
          </article>
        ))}
        <p className="pt-6 text-sm text-muted-foreground">{intermediaryDisclaimer}</p>
      </div>
    </SiteLayout>
  )
}
