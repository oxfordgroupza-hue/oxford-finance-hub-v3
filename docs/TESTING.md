# Testing and validation

## Standard commands
- `pnpm dev` — local Cloudflare Vite development server.
- `pnpm build` — Cloudflare-targeted application build.
- `pnpm typecheck` — TypeScript validation.
- `pnpm test` — Vitest suite.
- `pnpm lint` — ESLint.
- `pnpm cf:preview` — local Worker preview.

## Release validation
The Cloudflare Workers Build pipeline must complete the production or Preview build command, Wrangler type generation, TypeScript, the full test suite and lint. A successful client build alone is insufficient.

## Security acceptance
- Use synthetic test accounts and non-sensitive test data.
- Verify server-side authorization on direct route and API calls.
- Verify account suspension, verification, session expiry and logout.
- Verify file size, MIME, ownership and private-storage access controls before uploads are enabled.
- Confirm production feature gates remain disabled.
- Do not send live email or WhatsApp notifications during routine testing.
