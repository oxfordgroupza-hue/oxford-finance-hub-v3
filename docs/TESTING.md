## Current-state addendum — 25 November 2026

See [RELEASE_READINESS.md](RELEASE_READINESS.md) for current evidence and blockers. The last successful full build was `b89bab04-9fec-4121-b1f0-860eb171b9df` for commit `4e46a48da1460f61e090fcbcae4db9624d47f4eb`. The newer bounded multipart stream parser and its regression tests have not yet passed a complete Cloudflare build. Intermediate build failures exposed a TypeScript BlobPart type mismatch and a malformed multipart test fixture; the source was corrected and a new build queued. Do not record the newer source as passed until its own build completes Vite, Wrangler type generation, TypeScript, Vitest and ESLint.

---

# V3 testing and acceptance evidence

## Full Preview build command

```sh
pnpm cf:build && pnpm exec wrangler types worker-configuration.d.ts && pnpm typecheck && pnpm test && pnpm lint
```

## Latest full source validation

Build `dfeff3fd-211a-4a13-b8c0-ed46513f6056`, commit `aebe9893af6cf4bd9e6d2b535575172ab8c6d064`, Preview deployment 61:
- Vite Cloudflare build: passed.
- Wrangler type generation: passed.
- TypeScript: passed.
- Vitest: 39 files, 216 tests passed, 0 failed.
- ESLint: 0 errors, 2 warnings in generated `worker-configuration.d.ts`.
- Preview deployment: succeeded.

The build emitted the local Oxford hero, vehicle, equipment and about image assets. The image helper now imports those assets into the Cloudflare client bundle rather than relying on dynamically referenced public paths. Category cards use a single static image and no longer fade to transparent.

## Runtime checks completed on the preceding Preview deployment

- Health endpoint: HTTP 200; Supabase configured, bucket configured, storage verified, PII encryption configured, Neon authoritative.
- Same-origin unauthenticated document API POST: HTTP 401 as expected.
- 17 routes checked: public routes render; unauthenticated dashboard/Office/Admin/Partner routes redirect to login.
- Desktop/tablet/mobile smoke check found no horizontal overflow on the tested routes.
- The initial visual smoke check found broken image paths. The source fix is built and deployed in deployment 61; post-deployment visual confirmation remains outstanding because the browser-rendering service is rate-limited.

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
- Changed-files-only Prettier check, accessibility and visual responsive acceptance.
- Final security and qualified legal/compliance review.

Use synthetic Preview identities and dummy documents only. No production or real customer data may be used in acceptance tests.
