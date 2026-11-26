# Repository operating rules

1. Cloudflare Workers is the sole application runtime and deployment platform. Do not introduce another hosting adapter, deployment manifest, identity provider or database runtime.
2. Use `vite.cloudflare.config.ts` for development and builds. The Cloudflare database boundary must resolve server-side database imports to `db/cloudflare.ts`; browser imports must resolve to the fail-closed client stub.
3. Keep PostgreSQL migrations in `db/migrations/` and preserve their timestamp order and contents. Never delete or rewrite an applied migration.
4. `db/index.ts` is for explicitly configured local Node utilities only. Worker request handlers must use the Cloudflare request-scoped database adapter.
5. Keep production intake, document uploads and notification delivery disabled unless the relevant security and release approvals have been completed.
6. Do not expose secret values, personal information, application records or private documents in logs, test fixtures, source control or public routes.
7. Preserve role-based access control, immutable audit history, least privilege, account verification, origin validation and private document access.
8. Run the Cloudflare build, typecheck, tests and lint before proposing a release. Confirm the actual Cloudflare deployment and traffic allocation before reporting it as live.
