# V3 environment configuration

**Last checked:** 25 November 2026. Names only; never commit or print secret values.

## Target architecture

- Cloudflare Workers: application runtime.
- Cloudflare-native Oxford authentication: passwords, verification, recovery, sessions and account lifecycle.
- Neon PostgreSQL: authoritative relational database through the Cloudflare Hyperdrive binding.
- Supabase Storage: private application documents only.
- Brevo: transactional email.
- Netlify: rollback/reference environment during migration; not the V3 authentication or database authority.

## Cloudflare Worker bindings

Required server-side values/bindings:
- `HYPERDRIVE` — isolated Neon Preview connection.
- `SUPABASE_URL`
- `SUPABASE_BUCKET=oxford-customer-documents`
- `SUPABASE_SECRET_KEY` — encrypted secret binding only.
- `OXFORD_PII_ENCRYPTION_KEY` — encrypted secret binding only.
- `BREVO_API_KEY` — encrypted secret binding only.

Preview configuration also includes:
- `CONTEXT=cloudflare-preview`
- `OXFORD_APPLICATIONS_ENABLED=true`
- `OXFORD_DOCUMENT_UPLOADS_ENABLED=false`
- `OXFORD_EMAIL_DELIVERY_ENABLED=true`
- `OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED=true`
- `OXFORD_INITIAL_SUPER_ADMIN_EMAIL` — approved Oxford-owned Preview mailbox.
- `OXFORD_NOTIFICATION_ADMIN_EMAIL` — approved Oxford-owned Preview mailbox.
- `OXFORD_NOTIFICATION_FROM_EMAIL` and `OXFORD_NOTIFICATION_FROM_NAME`.

## Verified Preview status

The branch-specific Preview deployment contains all three encrypted secrets and the Neon Hyperdrive binding. The deployed health endpoint returned HTTP 200 with `configured=true`, `bucketConfigured=true`, `storageVerified=true`, `encryptionConfigured=true` and `authoritativeDatabase=neon`.

The same response reports `documentUploadsEnabled=false` and `liveApplicationsEnabled=false`. The application flag is set for controlled Preview functionality, but do not infer that real/live submissions are enabled. Keep all tests synthetic and confirm each workflow's server-side gate.

Email is enabled only for the approved Oxford-owned Preview recipient. No email has been sent. No Super Administrator account has been created.

## Rules

- Use separate Preview and Production values. Never copy production credentials into Preview.
- Never use a `VITE_` prefix for a secret.
- Never place secrets in source, docs, logs, build output, client bundles, email or chat.
- Do not change production secrets, Worker settings, database, domain, DNS or feature flags without separate explicit approval.
- A present secret is not proof of provider operation; rely on the runtime health and acceptance evidence, not configuration alone.
