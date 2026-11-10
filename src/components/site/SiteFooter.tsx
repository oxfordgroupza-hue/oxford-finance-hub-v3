import { Link } from '@tanstack/react-router'
import { intermediaryDisclaimer } from '@/lib/finance-config'
import { BrandLogo } from './BrandLogo'

const columns = [
  {
    title: 'Finance',
    links: [
      { to: '/solutions', label: 'Finance solutions' },
      { to: '/apply', label: 'Apply for finance' },
      { to: '/readiness', label: 'Application readiness' },
      { to: '/dashboard', label: 'My dashboard' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About us' },
      { to: '/partners', label: 'For partners' },
      { to: '/contact', label: 'Contact' },
      { to: '/support', label: 'Support' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy policy' },
      { to: '/popia', label: 'POPIA' },
      { to: '/terms', label: 'Terms & conditions' },
      { to: '/complaints', label: 'Complaints' },
    ],
  },
] as const

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-[oklch(0.12_0.004_80)]">
      <div className="mx-auto grid max-w-content gap-12 px-4 py-16 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-5">
          <BrandLogo />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Oxford Business Group (Pty) Ltd connects individuals and businesses with suitable finance providers.
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="eyebrow mb-4 font-sans">{col.title}</h2>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-foreground/75 hover:text-gold">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="gold-rule opacity-40" />
      <div className="mx-auto flex max-w-content flex-col gap-3 px-4 py-6 text-xs text-muted-foreground sm:px-6 md:flex-row md:justify-between">
        <p className="max-w-3xl leading-relaxed">{intermediaryDisclaimer}</p>
        <p className="shrink-0">© {new Date().getFullYear()} Oxford Business Group (Pty) Ltd</p>
      </div>
    </footer>
  )
}
