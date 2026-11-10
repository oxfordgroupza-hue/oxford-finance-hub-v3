import type { ReactNode } from 'react'
import { img } from '@/lib/images'

export function PageHero({
  eyebrow,
  title,
  intro,
  image = 'about.png',
  children,
}: {
  eyebrow: string
  title: ReactNode
  intro?: ReactNode
  image?: string
  children?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <img
        src={img(image, 1600, 60)}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover opacity-25"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
      <div className="relative mx-auto max-w-content px-4 py-20 sm:px-6 md:py-28">
        <p className="eyebrow fade-up">{eyebrow}</p>
        <h1 className="fade-up mt-4 max-w-3xl text-4xl leading-[1.05] font-medium md:text-6xl">{title}</h1>
        {intro && <p className="fade-up mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">{intro}</p>}
        {children && <div className="fade-up mt-8">{children}</div>}
      </div>
    </section>
  )
}
