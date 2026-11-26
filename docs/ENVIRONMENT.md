# Environment configuration

## Runtime environments
- Cloudflare Preview Worker: isolated preview configuration and preview Neon branch.
- Cloudflare Production Worker: `oxford-finance-hub-v3-production`.
- Production hostname: https://finance.oxfordbusinessgroup.co.za

## Required bindings and configuration
- `HYPERDRIVE`: Cloudflare Hyperdrive connection to the correct Neon branch.
- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_BUCKET`: private bucket name `oxford-customer-documents`.
- `SUPABASE_SECRET_KEY`: secret storage credential.
- `OXFORD_PII_ENCRYPTION_KEY`: secret used for applicant PII encryption.
- `BREVO_API_KEY`: secret used for transactional email.
- `CONTEXT`: explicit runtime context.
- `OXFORD_APPLICATIONS_ENABLED`: production remains false.
- `OXFORD_DOCUMENT_UPLOADS_ENABLED`: production remains false.
- `OXFORD_NOTIFICATION_DELIVERY_ENABLED`: production remains false.
- `OXFORD_EMAIL_DELIVERY_ENABLED`: verify the live send path before use.
- `OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED` and `OXFORD_INITIAL_SUPER_ADMIN_EMAIL`: one-time bootstrap controls.

Store secret values only in Cloudflare secret configuration. Do not put credentials in source files, build output or documentation. Keep Preview and Production bindings separate.
