# Oxford Finance Hub V3

Oxford Finance Hub is the finance-intermediary platform of Oxford Business Group (Pty) Ltd, operating in South Africa.

**This is a recovery and development repository, not a production release.** The controlling functional and business requirements remain the Oxford Finance Hub V3 master project recovery and release specification dated 10 November 2026. The infrastructure/authentication/database architecture is superseded by the accepted decision in [ADR-001](docs/architecture/ADR-001-CLOUDFLARE-NEON-AUTH.md).

## Approved target architecture

- **Cloudflare Workers:** application hosting and server runtime.
- **Oxford-owned Cloudflare-native authentication:** registration, password hashing, email verification, recovery, secure sessions and account lifecycle.
- **Neon PostgreSQL:** authoritative V3 database for accounts, access control, applications, partners, audit events and workflows.
- **Supabase Storage:** private customer/application document storage; no public buckets or unauthorised direct access.
- **Brevo:** transactional email, controlled by explicit environment gates and recipient restrictions.
- **Netlify:** retained as a rollback/reference environment during migration; Netlify Identity and Netlify Database are no longer the target V3 authorities.

## Current development boundary

The active development branch is `work/v3-cloudflare-native-auth` and its Cloudflare Preview is isolated from production. The preview Neon branch contains schema and reference data but no customer or application records. Production hosting, DNS, database, secrets and customer processing remain untouched.

Preview feature flags and secrets are environment-specific. Document uploads remain disabled. Email is restricted to the approved preview mailbox. Do not send real customer communications, create real applications, upload real documents, process payments or settlements, or use production data in Preview.

## Validation and release

A previous Cloudflare Preview build completed successfully with TypeScript, 215 automated tests and ESLint passing. This is not comprehensive end-to-end acceptance and does not establish release readiness. Repository-wide Prettier validation remains outstanding (181 files were reported by the attempted check); avoid unrelated mass-formatting.

The release remains blocked until the full role, permission, partner-isolation, application, document-security, fee/VAT, audit, notification and operational workflows have been completed and comprehensively tested. Keep release gates fail-closed. Do not merge the draft pull request, bind the production custom domain, change production resources or cut over without separate explicit approval.

See [the accepted architecture decision](docs/architecture/ADR-001-CLOUDFLARE-NEON-AUTH.md), [project plan](PLAN.md), [recovery findings](docs/recovery/M0-INITIAL-FINDINGS.md), [recovery baseline](docs/architecture/RECOVERY-BASELINE.md) and [contributor rules](AGENTS.md).
