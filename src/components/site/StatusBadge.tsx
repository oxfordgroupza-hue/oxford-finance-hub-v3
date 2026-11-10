import type { ApplicationStatus } from '@/lib/finance-config'
import type { Priority } from '@/lib/fixtures'
import { cn } from '@/lib/utils'

const statusTone: Record<ApplicationStatus, string> = {
  Draft: 'border-border text-muted-foreground',
  Submitted: 'border-info/40 text-info bg-info/10',
  'Under review': 'border-gold/40 text-gold bg-gold/10',
  'Awaiting documents': 'border-warning/40 text-warning bg-warning/10',
  'With finance provider': 'border-info/40 text-info bg-info/10',
  'Provider decision received': 'border-success/40 text-success bg-success/10',
  Closed: 'border-border text-muted-foreground',
}

export function StatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-medium whitespace-nowrap', statusTone[status], className)}>
      {status}
    </span>
  )
}

const priorityTone: Record<Priority, string> = {
  High: 'bg-destructive/15 text-[oklch(0.75_0.15_27)] border-destructive/40',
  Medium: 'bg-warning/10 text-warning border-warning/40',
  Low: 'bg-muted text-muted-foreground border-border',
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium', priorityTone[priority])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      {priority}
    </span>
  )
}
