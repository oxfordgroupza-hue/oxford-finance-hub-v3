# V3 recovery baseline — consolidated findings

## Current platform
Oxford Finance Hub V3 runs on Cloudflare Workers with Neon PostgreSQL, Cloudflare Hyperdrive, private Supabase Storage and Brevo transactional email.

## Source of truth
- Application code: `oxfordgroupza-hue/oxford-finance-hub-v3`.
- Production runtime: `oxford-finance-hub-v3-production`.
- Production database: Neon production branch.
- Ordered SQL history: `db/migrations/`.
- Private document bucket: `oxford-customer-documents`.

## Security and operational status
Production application intake, document uploads and notification delivery remain disabled. The designated initial Super Administrator account remains unverified. No production migration or customer data operation should be inferred from a code deployment.

## Next required work
Verify the migration baseline, complete Preview acceptance, validate the production build pipeline, verify authentication email delivery, and complete the required legal and regulatory review before any customer-facing processing is enabled.
