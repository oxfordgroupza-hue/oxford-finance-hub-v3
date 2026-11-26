# Oxford Finance Hub V3

Oxford Finance Hub V3 is the private finance-enquiry and application platform for Oxford Business Group.

## Production architecture
- Application runtime: Cloudflare Workers.
- Database: Neon PostgreSQL through Cloudflare Hyperdrive.
- Private applicant-document storage: Supabase Storage, private bucket `oxford-customer-documents`.
- Transactional email provider: Brevo.
- Source control and CI: GitHub.
- Production application: https://finance.oxfordbusinessgroup.co.za
- Repository: https://github.com/oxfordgroupza-hue/oxford-finance-hub-v3

Cloudflare is the only deployment and runtime platform for this application. The application source, database migrations, local tooling and documentation must remain aligned with this architecture.

## Repository layout
- `src/`: TanStack Start application, routes, server functions and shared domain logic.
- `db/schema.ts`: PostgreSQL schema.
- `db/cloudflare.ts`: request-scoped Worker database adapter.
- `db/migrations/`: ordered SQL migration history.
- `scripts/`: local administration and database utilities.
- `wrangler.jsonc`: Cloudflare Worker configuration.
- `vite.cloudflare.config.ts`: Cloudflare Vite build and runtime boundary.
- `supabase/migrations/`: Supabase Storage policies and setup migrations.

## Safety defaults
Production application intake, document uploads and notification delivery remain disabled until their respective security, regulatory and operational acceptance checks are complete. Do not enable them as part of routine deployment work. Do not store identity documents, bank statements or applicant credentials in public storage or source control.

## Validation
```bash
pnpm install --frozen-lockfile
pnpm cf:build
pnpm typecheck
pnpm test
pnpm lint
```

Database utilities require an explicitly supplied `DATABASE_URL`. Never print or commit secrets.
