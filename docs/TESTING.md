# V3 testing and acceptance evidence

## Full Preview build command

```sh
pnpm cf:build && pnpm exec wrangler types worker-configuration.d.ts && pnpm typecheck && pnpm test && pnpm lint
```

## Latest full source validation

Build `3f1b78c4-f4ac-4954-9672-8c982a1e2ce9`, commit `26c693231afd394f5b74b907a0f3d50df8e803f8`:
- Vite Cloudflare build: passed.
- Wrangler type generation: passed.
- TypeScript: passed.
- Vitest: 39 files, 216 tests passed, 0 failed.
- ESLint: 0 errors, 2 warnings in generated `worker-configuration.d.ts`.

A later documentation-only commit was also built successfully. New bundled-image source changes are pending their next full Preview build; do not treat them as validated until that build completes.

## Runtime checks completed

- Health endpoint: HTTP 200; Supabase configured, bucket configured, storage verified, PII encryption configured, Neon authoritative.
- Same-origin unauthenticated document API POST: HTTP 401 as expected.
- 17 routes checked: public routes render; unauthenticated dashboard/Office/Admin/Partner routes redirect to login.
- Desktop/tablet/mobile smoke check found no horizontal overflow on the tested routes.
- The same visual smoke check exposed missing finance images; the source has since been changed to bundle local assets. Verify those images again after the next deployment.

## Still required

- Authentication lifecycle and one-time Super Administrator bootstrap.
- Staff invitation/activation.
- Seven-role direct-route and server-function authorization matrix.
- Eight Individual/Business × four finance-category application journeys.
- Office intake and partner referral/merchant workflows.
- Dummy document upload/download/isolation/recovery.
- Brevo delivery/failure tests to the approved Preview mailbox.
- PBKDF2 Worker benchmark.
- Backup/restore test.
- Changed-files-only Prettier check, accessibility and responsive acceptance.
- Final security and qualified legal/compliance review.

Use synthetic Preview identities and dummy documents only. No production or real customer data may be used in acceptance tests.
