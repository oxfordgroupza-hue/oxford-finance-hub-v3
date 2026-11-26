## Current-state addendum — 26 November 2026

Latest development branch head: `045d5b1d6015ef02513e1694d660d9ea8823f23b`. Cloudflare Workers Build `0fa45b27-03c3-4c79-9e4b-807d907928f5` completed successfully and deployed Preview to `https://ec8f277b-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/`. The configured build command runs `pnpm cf:build`, Wrangler type generation, TypeScript, Vitest and ESLint. The build record confirms success; a separate current Vitest test-count summary was not surfaced, so the older 39-file/216-test count must not be presented as the latest count.

Read-only GET checks of Preview `/`, `/apply` and `/login` returned HTTP 200. No application was submitted and no email was sent during this audit. Cloudflare Workers Builds is the active branch validation pipeline; GitHub Actions was not used for this build.
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
