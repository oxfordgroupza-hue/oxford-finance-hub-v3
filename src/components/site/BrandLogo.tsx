import { Link } from '@tanstack/react-router'
import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn('size-9', className)}>
      <defs>
        <linearGradient id="obg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold-soft)" />
          <stop offset="0.5" stopColor="var(--gold)" />
          <stop offset="1" stopColor="var(--gold-deep)" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" fill="none" stroke="url(#obg-gold)" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="11" fill="none" stroke="url(#obg-gold)" strokeWidth="2.2" />
      <path d="M20 6v28M6 20h28" stroke="url(#obg-gold)" strokeWidth="0.6" opacity="0.55" />
    </svg>
  )
}

export function BrandLogo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn('group flex items-center gap-3', className)} aria-label="Oxford Finance Hub home">
      <BrandMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-semibold tracking-wide text-foreground">Oxford</span>
        <span className="mt-1 text-[0.58rem] font-semibold tracking-[0.32em] text-gold uppercase">Finance Hub</span>
      </span>
    </Link>
  )
}
