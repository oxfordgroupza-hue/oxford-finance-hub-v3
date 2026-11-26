> **Current release status (26 November 2026): Production Worker is deployed, but the platform is NOT READY for live customer applications.** Application intake, document uploads and notification delivery remain disabled. See [Release Readiness](docs/RELEASE_READINESS.md) for the remaining security, migration, email and compliance gates.

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
- **Cloudflare Workers:** the sole application runtime and deployment platform.

## Current development boundary

- Production release branch: `release/v3-production-2026-11-25`.
- Production Worker: `oxford-finance-hub-v3-production` at `finance.oxfordbusinessgroup.co.za`.
- Preview Worker: `oxford-finance-hub-v3-preview` with an isolated `cloudflare-preview` Neon branch.
- Production database and customer records were not changed during the deployment sequence. Intake, uploads and notifications remain disabled.

Preview secrets are environment-specific. Document uploads remain disabled. Email is restricted to the approved Preview mailbox. Do not send real customer communications, create real applications, upload real documents, process payments or settlements, or use production data in Preview.

## Validation and release

The current release requires a fresh Cloudflare Preview acceptance run after the latest source changes. Do not treat a successful Worker upload as proof of end-to-end acceptance.

This is not comprehensive end-to-end acceptance and does not establish release readiness. Authentication/bootstrap, all role permissions, all application journeys, document security, email delivery, backup/restore, changed-files formatting, visual acceptance and qualified legal review remain open.

See [Preview acceptance](docs/CLOUDFLARE-PREVIEW-ACCEPTANCE.md), [testing evidence](docs/TESTING.md), [known issues](docs/KNOWN_ISSUES.md), [security baseline](docs/SECURITY.md), [backup and recovery](docs/BACKUP_RECOVERY.md), [accepted architecture decision](docs/architecture/ADR-001-CLOUDFLARE-NEON-AUTH.md), [project plan](PLAN.md) and [contributor rules](AGENTS.md).

Do not apply production database migrations, change secrets or feature flags, process customer data, or enable intake, uploads or notifications without explicit approval.
