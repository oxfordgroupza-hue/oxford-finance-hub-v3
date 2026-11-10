import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { documentCollectionNotice } from '@/lib/finance-config'
import { toast } from 'sonner'
import { submitEnquiry } from '@/lib/enquiry-actions'
import { PreviewNotice } from './PreviewNotice'

export interface ExtraField {
  id: string
  label: string
  options?: string[]
  required?: boolean
}

/**
 * Shared enquiry form used by Contact, Support, Complaints and Partners.
 * Preview: validates and confirms in the browser. Milestone 5 posts it to the
 * SupportRequest / PartnerRegistration tables.
 */
export function EnquiryForm({ kind, title, extraFields = [], submitLabel = 'Send enquiry' }: { kind: 'contact' | 'support' | 'complaint' | 'partner'; title: string; extraFields?: ExtraField[]; submitLabel?: string }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)
  const [requestId, setRequestId] = useState<string | null>(null)
  const set = (k: string, v: string) => { setValues((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })) }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pending) return
    const err: Record<string, string> = {}
    if (!values.name?.trim()) err.name = 'Enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email ?? '')) err.email = 'Enter a valid email address.'
    for (const f of extraFields) if (f.required && !values[f.id]?.trim()) err[f.id] = `${f.label} is required.`
    if (!values.message?.trim()) err.message = 'Enter a message.'
    setErrors(err)
    if (Object.values(err).some(Boolean)) return
    setPending(true)
    try {
      const fields = Object.fromEntries(Object.entries(values).filter(([key]) =>
        !['name', 'email', 'phone', 'message'].includes(key),
      ))
      const result = await submitEnquiry({
        data: {
          kind,
          name: values.name.trim(),
          email: values.email.trim(),
          phone: values.phone ?? '',
          message: values.message.trim(),
          fields,
        },
      })
      setRequestId(result.id)
      setSent(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Your message could not be saved. Please try again.')
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-sm border border-gold/40 bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto size-10 text-gold" />
        <h3 className="mt-4 text-2xl">{kind === 'partner' ? 'Registration received' : 'Thank you'}</h3>
        <p className="mt-2 text-sm text-muted-foreground">Reference: <span className="font-mono">{requestId}</span></p>
        <PreviewNotice className="mt-6 text-left">
          {kind === 'partner'
            ? 'Your partner registration has been recorded as pending review. Referral links are issued only after the Oxford office approves and links your partner account.'
            : 'Your message has been saved to the Oxford office inbox. Automated email delivery is not yet active, so please do not include identity numbers, bank details or supporting documents in this form.'}
        </PreviewNotice>
      </div>
    )
  }

  const err = (k: string) => errors[k] ? <p className="text-xs text-[oklch(0.75_0.15_27)]">{errors[k]}</p> : null
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-sm border border-border bg-card p-6 sm:p-8">
      <h3 className="text-2xl">{title}</h3>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor={`${kind}-name`}>Full name</Label><Input id={`${kind}-name`} autoComplete="name" aria-invalid={Boolean(errors.name)} value={values.name ?? ''} onChange={(e) => set('name', e.target.value)} />{err('name')}</div>
        <div className="space-y-2"><Label htmlFor={`${kind}-email`}>Email</Label><Input id={`${kind}-email`} type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} value={values.email ?? ''} onChange={(e) => set('email', e.target.value)} />{err('email')}</div>
        <div className="space-y-2"><Label htmlFor={`${kind}-phone`}>Phone (optional)</Label><Input id={`${kind}-phone`} type="tel" autoComplete="tel" value={values.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></div>
        {extraFields.map((f) => (
          <div key={f.id} className="space-y-2">
            <Label htmlFor={`${kind}-${f.id}`}>{f.label}{!f.required && ' (optional)'}</Label>
            {f.options ? (
              <Select value={values[f.id] ?? ''} onValueChange={(v) => set(f.id, v)}>
                <SelectTrigger id={`${kind}-${f.id}`} className="w-full" aria-invalid={Boolean(errors[f.id])}><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{f.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <Input id={`${kind}-${f.id}`} aria-invalid={Boolean(errors[f.id])} value={values[f.id] ?? ''} onChange={(e) => set(f.id, e.target.value)} />
            )}
            {err(f.id)}
          </div>
        ))}
      </div>
      <div className="space-y-2"><Label htmlFor={`${kind}-message`}>Message</Label><Textarea id={`${kind}-message`} rows={5} aria-invalid={Boolean(errors.message)} value={values.message ?? ''} onChange={(e) => set('message', e.target.value)} />{err('message')}</div>
      <p className="text-xs text-muted-foreground">{documentCollectionNotice}</p>
      <Button type="submit" variant="gold" className="rounded-sm" disabled={pending}>{pending ? 'Sending…' : submitLabel}</Button>
    </form>
  )
}
