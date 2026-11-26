# Oxford Finance Hub V3

Oxford Finance Hub is the finance-intermediary platform of Oxford Business Group (Pty) Ltd.

## Architecture
- Cloudflare Workers application runtime.
- Oxford-owned authentication and role-based access control.
- Neon PostgreSQL through Cloudflare Hyperdrive.
- Private Supabase document storage.
- Brevo transactional email.
- SQL migrations under `db/migrations/`.

## Development
- `pnpm dev` — Cloudflare Vite development server.
- `pnpm build` — Cloudflare-targeted build.
- `pnpm typecheck` — TypeScript.
- `pnpm test` — Vitest.
- `pnpm lint` — ESLint.
- `pnpm cf:preview` — local Worker preview.

## Production safeguards
Public pages are deployed at https://finance.oxfordbusinessgroup.co.za. Real application intake, document uploads and notification delivery remain disabled until their independent security, operational and compliance acceptance gates pass.

Use synthetic data only in isolated Preview testing. Never commit secrets or place credentials in source, documentation, logs or client bundles.
