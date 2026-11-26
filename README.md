> **Current release status (26 November 2026): NOT READY for real applicant submissions or document uploads.** The production Worker remains attached to finance.oxfordbusinessgroup.co.za; application submissions and document uploads remain disabled. The verified source baseline is work/v3-cloudflare-native-auth. This isolated cleanup branch is recovery/cloudflare-only-source-cleanup. Local validation on the cleanup branch passed: Cloudflare build, Wrangler type generation, TypeScript, 37 Vitest files / 237 tests, ESLint with zero warnings, and Prettier checks for updated documentation/configuration and git diff --check. The branch has not yet been deployed as a Cloudflare Workers Build and no production resources were changed. See [Release Readiness](docs/RELEASE_READINESS.md).

---

# Oxford Finance Hub V3

Oxford Finance Hub is the finance-intermediary platform of Oxford Business Group (Pty) Ltd, operating in South Africa.

**This is a recovery and development repository, not a production release.** The controlling functional and business requirements remain the Oxford Finance Hub V3 master project recovery and release specification dated 10 November 2026. The infrastructure/authentication/database architecture is superseded by the accepted decision in [ADR-001](docs/architecture/ADR-001-CLOUDFLARE-NEON-AUTH.md).

## Approved target architecture

- **Cloudflare Workers:** application hosting and server runtime.
- **Oxford-owned Cloudflare-native authentication:** registration, password hashing, email verification, recovery, secure sessions and account lifecycle.
- **Neon PostgreSQL:** authoritative V3 database for accounts, access control, applications, partners, audit events and workflows.
- **Supabase Storage:** private customer/application document storage; no public buckets or unauthorised direct access.
- **Brevo:** transactional email, controlled by explicit environment gates and recipient restrictions.
- **Deployment boundary:** Cloudflare Workers is the sole supported application runtime; the repository contains no legacy hosting, identity or database adapters.

## Current development boundary

- Source baseline branch: work/v3-cloudflare-native-auth.
- Current isolated cleanup branch: recovery/cloudflare-only-source-cleanup.
- Stable Preview reference: https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/
- Latest immutable Preview deployment: https://ec8f277b-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/
- Preview Neon branch: isolated cloudflare-preview.
- Production Worker and custom domain are already attached. Its Neon connection targets production-2026-11-25; production application intake and document uploads are disabled. Do not describe production as untouched. No further production changes are authorised without separate approval.

Preview secrets are environment-specific. Document uploads remain disabled. Email is restricted to the approved Preview mailbox. Do not send real customer communications, create real applications, upload real documents, process payments or settlements, or use production data in Preview.

## Validation and release

The source baseline branch build 1ed97f2d-b578-4c94-b81e-38ace98786cd for head d0fcc2cb61570b43bc6246187a7dc6ed8058d2ce completed successfully. The cleanup branch has independently passed local Wrangler type generation, the Cloudflare build, TypeScript, all 237 Vitest tests across 37 files, ESLint with zero warnings, and Prettier checks for updated documentation/configuration and git diff --check. The cleanup branch has not yet been deployed as a Cloudflare Workers Build; production Worker settings and feature gates were not changed.
This is not comprehensive end-to-end acceptance and does not establish release readiness. Authentication/bootstrap, all role permissions, all application journeys, document security, email delivery, backup/restore, changed-files formatting, visual acceptance and qualified legal review remain open.

See [Preview acceptance](docs/CLOUDFLARE-PREVIEW-ACCEPTANCE.md), [testing evidence](docs/TESTING.md), [known issues](docs/KNOWN_ISSUES.md), [security baseline](docs/SECURITY.md), [backup and recovery](docs/BACKUP_RECOVERY.md), [accepted architecture decision](docs/architecture/ADR-001-CLOUDFLARE-NEON-AUTH.md), [project plan](PLAN.md) and [contributor rules](AGENTS.md).

PR #9 was merged into `recovery/import-verified-baseline` on 26 November 2026 (merge commit `78fd5b978197ec0729bab0444a44b522300898ef`), not into `main`. The development branch has ten subsequent reconciliation commits that are not part of that merge. Do not reopen or merge into `main` without explicit approval. Do not change the already-attached production custom domain, production resources or feature flags without separate explicit approval.
