# Oxford Finance Hub V3 — recovery baseline

The V3 recovery baseline is maintained in the V3 repository only. V2 and legacy repositories remain read-only references.

- Cloudflare Workers is the sole supported application runtime and deployment target.
- Oxford-owned Cloudflare-native authentication and Neon PostgreSQL via Hyperdrive are authoritative for identity and relational data.
- Supabase Storage is private document storage only.
- Brevo is reserved for gated transactional email; WhatsApp and HubSpot are deferred to the final integration stage.
- SQL history is stored under drizzle/migrations and must be reconciled against the live Neon schema before any production migration.
- Production application intake and document uploads remain disabled until acceptance and release approval.
- No secrets, applicant data, bank details, document contents or confidential commercial terms may be committed.
