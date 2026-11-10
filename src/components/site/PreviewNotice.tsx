import { FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Marks a screen that runs on preview data until its backend milestone ships. */
export function PreviewNotice({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'flex items-start gap-3 rounded-sm border border-gold/30 bg-gold/[0.06] px-4 py-3 text-sm text-foreground/85',
        className,
      )}
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}
