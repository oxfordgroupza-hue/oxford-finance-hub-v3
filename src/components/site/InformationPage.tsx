import type { ReactNode } from 'react'
import { PageHero } from './PageHero'
import { SiteLayout } from './SiteLayout'

export interface InfoSection {
  heading: string
  body: ReactNode
}

export function InformationPage({
  eyebrow, title, intro, sections, draftNotice = false, aside,
}: { eyebrow: string; title: string; intro: string; sections: InfoSection[]; draftNotice?: boolean; aside?: ReactNode }) {
  return (
    <SiteLayout>
      <PageHero eyebrow={eyebrow} title={title} intro={intro} />
      <div className="mx-auto grid max-w-content gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="On this page" className="hidden lg:block">
          <ul className="sticky top-28 space-y-2 border-l border-border pl-4 text-sm">
            {sections.map((s, i) => (
              <li key={s.heading}><a href={`#s${i}`} className="text-muted-foreground hover:text-gold">{s.heading}</a></li>
            ))}
          </ul>
        </nav>
        <div className="max-w-reading space-y-12">
          {draftNotice && (
            <p className="rounded-sm border border-border bg-card px-4 py-3 text-xs text-muted-foreground">
              Draft wording prepared for review by Oxford Business Group and its legal advisers before launch.
            </p>
          )}
          {sections.map((s, i) => (
            <section key={s.heading} id={`s${i}`} className="scroll-mt-28">
              <h2 className="text-3xl font-medium">{s.heading}</h2>
              <div className="mt-4 space-y-4 leading-relaxed text-foreground/80 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-2">{s.body}</div>
            </section>
          ))}
          {aside}
        </div>
      </div>
    </SiteLayout>
  )
}
