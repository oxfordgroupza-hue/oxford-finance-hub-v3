type ContactDetailsProps = { compact?: boolean }

export function ContactDetails({ compact = false }: ContactDetailsProps) {
  return (
    <section className={compact ? 'space-y-2 text-sm' : 'rounded-sm border border-border bg-card p-6'}>
      <h2 className={compact ? 'eyebrow font-sans' : 'text-xl font-medium'}>Contact Oxford</h2>
      <dl className={compact ? 'space-y-1.5' : 'mt-4 space-y-3 text-sm'}>
        <div>
          <dt className="text-muted-foreground">Office telephone</dt>
          <dd><a className="text-gold hover:underline" href="tel:+27100570991">+27 10 057 0991</a></dd>
        </div>
        <div>
          <dt className="text-muted-foreground">WhatsApp</dt>
          <dd><a className="text-gold hover:underline" href="https://wa.me/27639089071" target="_blank" rel="noreferrer">+27 63 908 9071</a></dd>
        </div>
        <div>
          <dt className="text-muted-foreground">General enquiries</dt>
          <dd><a className="break-all text-gold hover:underline" href="mailto:info@oxfordbusinessgroup.co.za">info@oxfordbusinessgroup.co.za</a></dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Finance applications and assistance</dt>
          <dd><a className="break-all text-gold hover:underline" href="mailto:apply@oxfordbusinessgroup.co.za">apply@oxfordbusinessgroup.co.za</a></dd>
        </div>
        {!compact && (
          <div>
            <dt className="text-muted-foreground">Website</dt>
            <dd><a className="text-gold hover:underline" href="https://www.oxfordbusinessgroup.co.za" target="_blank" rel="noreferrer">www.oxfordbusinessgroup.co.za</a></dd>
          </div>
        )}
      </dl>
    </section>
  )
}
