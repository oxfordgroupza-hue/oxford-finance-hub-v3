# Recovery baseline

## Current architecture
- Cloudflare Workers application runtime.
- Oxford-owned authentication and role-based access control.
- Neon PostgreSQL through Hyperdrive.
- Private Supabase document storage.
- Brevo transactional email.
- SQL migrations under `db/migrations/`.

## Baseline rules
- Preserve source history and migration contents.
- Never apply migrations to Production as part of a code-only recovery.
- Keep Production applications, document uploads and notifications disabled until acceptance.
- Use isolated Preview data and synthetic test accounts.
- Verify database backup and restore before schema changes.
- Do not create, reset or disclose administrator credentials on behalf of the account owner.
