# Recovery baseline

The current application baseline is the Cloudflare Workers release branch and its corresponding Git commit.

- Runtime: Cloudflare Worker `oxford-finance-hub-v3-production`.
- Database: Neon PostgreSQL through Hyperdrive.
- Private object storage: Supabase bucket `oxford-customer-documents`.
- Email: Brevo transactional API.
- Migration history: `db/migrations/`.
- Production intake, uploads and notifications remain disabled.

Recovery must preserve the production database, private object store and secret configuration. Roll back the Worker to a known-good version only after confirming the corresponding code and schema compatibility. Do not apply migrations or restore data as part of an application rollback unless the recovery plan explicitly requires it.
