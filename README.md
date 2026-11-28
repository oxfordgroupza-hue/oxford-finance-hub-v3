> **Current release status (25 November 2026): NOT READY for public recruitment or real applicant submissions.** The current evidence and remaining gates are tracked in [Release Readiness](docs/RELEASE_READINESS.md). Production remains untouched; Preview is synthetic-data-only. The latest code commit is `fc6d21ce54897901f5cb0305005151623edc2f10`; its bounded multipart parser build is still pending. The last successful full build predates that parser change.

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
- **Netlify:** historical legacy references only. Do not deploy to, use or configure Netlify. Cloudflare is the approved V3 hosting and deployment platform.

## Current development boundary

- Deployed source baseline: `fix/finance-hub-whatsapp-reference-format` at `464a26aaa0a2157b1fda3abd0e90f2eb1640891a` (verified by exact application-source fingerprint on 28 November 2026).
- Current development branch: `feature/finance-provider-disclosures-2026-11-28`.
- Stable Preview reference: https://work-v3-cloudflare-native-auth-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/
- Latest immutable Preview deployment: https://9d173fa4-oxford-finance-hub-v3-preview.oxfordbusinessgroup.workers.dev/
- Preview Neon branch: isolated `cloudflare-preview`.
- Production hosting, DNS, database, secrets and customer processing remain untouched.

Preview secrets are environment-specific. Document uploads remain disabled. Email is restricted to the approved Preview mailbox. Do not send real customer communications, create real applications, upload real documents, process payments or settlements, or use production data in Preview.

## Validation and release

Latest full Preview build: **39 test files, 216 tests passed, TypeScript passed, ESLint zero errors** (two warnings in generated Worker types). The latest deployment includes locally bundled finance imagery.

This is not comprehensive end-to-end acceptance and does not establish release readiness. Authentication/bootstrap, all role permissions, all application journeys, document security, email delivery, backup/restore, changed-files formatting, visual acceptance and qualified legal review remain open.

See [Preview acceptance](docs/CLOUDFLARE-PREVIEW-ACCEPTANCE.md), [testing evidence](docs/TESTING.md), [known issues](docs/KNOWN_ISSUES.md), [security baseline](docs/SECURITY.md), [backup and recovery](docs/BACKUP_RECOVERY.md), [accepted architecture decision](docs/architecture/ADR-001-CLOUDFLARE-NEON-AUTH.md), [project plan](PLAN.md) and [contributor rules](AGENTS.md).

Keep PR #9 draft and unmerged. Do not bind the production custom domain, change production resources or cut over without separate explicit approval.
