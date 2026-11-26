# V3 environment configuration

**Last verified:** 26 November 2026. Record names and states only; never commit or print secret values.

## Architecture

- Cloudflare Workers: application runtime.
- Oxford-owned authentication: passwords, verification, recovery, sessions and account lifecycle.
- Neon PostgreSQL: authoritative relational database through Cloudflare Hyperdrive.
- Supabase Storage: private application documents.
- Brevo: transactional email.
- SQL migrations: `db/migrations/`.

## Production Worker bindings

The production Worker is `oxford-finance-hub-v3-production`. Its configured bindings include:

- `HYPERDRIVE` — existing Neon PostgreSQL connection.
- `SUPABASE_URL`
- `SUPABASE_BUCKET=oxford-customer-documents`
- `SUPABASE_SECRET_KEY` — encrypted secret.
- `OXFORD_PII_ENCRYPTION_KEY` — encrypted secret.
- `BREVO_API_KEY` — encrypted secret.

Production feature flags checked after the latest deployment:

- `CONTEXT=cloudflare-production`
- `OXFORD_APPLICATIONS_ENABLED=false`
- `OXFORD_DOCUMENT_UPLOADS_ENABLED=false`
- `OXFORD_EMAIL_DELIVERY_ENABLED=true`
- `OXFORD_NOTIFICATION_DELIVERY_ENABLED=false`
- `OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED=true`
- Designated initial administrator email: `oxfordbusinessgroup@outlook.com`

## Rules

- Keep Preview and Production credentials separate.
- Never use a `VITE_` prefix for a secret.
- Never put secret values in source, documentation, logs, build output, client bundles, email or chat.
- Do not change production secrets, Worker settings, database, domain, DNS or feature flags without explicit authorization.
- A configured secret is not proof of provider operation; require runtime and end-to-end evidence.
- Keep applications, uploads and notification delivery disabled until their separate acceptance gates pass.
