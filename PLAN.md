# Oxford Finance Hub V3 — delivery plan and milestone status

**Assessment date:** 25 November 2026  
**Current release verdict:** **NOT READY for public recruitment or real applicant submissions.**  
**Authoritative current evidence:** [docs/RELEASE_READINESS.md](docs/RELEASE_READINESS.md)  
**Active branch:** `work/v3-cloudflare-native-auth`  
**PR #9:** open, draft and unmerged.

## Milestone status

| Milestone | Scope | Current status |
|---|---|---|
| M0 | Repository recovery, comparison and sanitised source import | **Partially complete.** V3 is the sole development target; full source-to-master-specification traceability remains to be closed. |
| M1 | Full audit, architecture and evidence register | **Partially complete.** Cloudflare/Neon/Storage/Brevo target architecture is approved; final requirements and acceptance matrix remain open. |
| M2 | Database, core domain and migrations | **Partially complete.** Neon Preview schema and catalogue are present. No migration-history table exists in the Preview database; a verified Neon migration baseline and repeatable migration process remain required. |
| M3 | Identity provisioning and authentication | **Implemented in source; end-to-end acceptance pending.** Cloudflare-native auth, credentials, verification, recovery, sessions and bootstrap logic exist. No Preview user or Super Administrator account exists yet. |
| M4 | Roles, permissions and Super Administrator | **Catalogue implemented; end-to-end acceptance pending.** Seven roles, 90 permission keys and 148 role-permission assignments are present in Neon Preview. |
| M5 | Public site and customer application | **Preview implementation present; real use disabled.** Public pages and Individual/Business application wizard are built. Preview submissions are synthetic-only; production submissions are disabled. |
| M6 | Customer and Office lifecycle | **Implemented in source; end-to-end acceptance pending.** Customer account, Office intake, applicant claim and staff invitation workflows need controlled acceptance. |
| M7 | Partner referrals, linking and Office intake | **Implemented in source; end-to-end acceptance pending.** Referral attribution, partner scoping and assisted intake need the full synthetic workflow and authorization matrix. |
| M8 | Commercial fee model | **Calculation/workflow source present; business approval pending.** No confidential commercial rates may be committed to the public repository. |
| M9 | Settlements and payouts | **Recording/calculation source present; acceptance pending.** Reconciliation, adjustments and partner net visibility require testing. Actual payout execution remains disabled. |
| M10 | Internal credit assessment | **Assessment source present; human review only.** No bureau integration or automated approve/decline decision is represented. Active ruleset approval and end-to-end tests remain required. |
| M11 | Private document storage | **Provider configured; acceptance pending.** Supabase bucket is private and empty. Uploads are disabled. Upload/download, isolation, expiry, retries and recovery have not passed acceptance. |
| M12 | Notifications and automation | **Preview configuration present; delivery acceptance pending.** Brevo is restricted to the approved Oxford-owned Preview mailbox. No email has been sent; WhatsApp delivery is not enabled. |
| M13 | Security and QA | **Partially complete.** Automated security helpers and tests exist. Latest bounded multipart stream-parser build is pending; full auth, role, document and workflow tests remain open. |
| M14 | Staging and acceptance | **Preview infrastructure present; release acceptance incomplete.** Neon, Cloudflare Preview and private storage are configured. No user journey has passed the complete authenticated acceptance matrix. |
| M15 | Production | **Not started / separately gated.** No production deployment, domain cutover, live feature flags or real data processing is authorised by this plan. |

## Current verified state

- Neon Preview branch `br-autumn-rain-bgtzmfh8` is isolated and non-primary.
- Neon Preview catalogue: 7 roles, 90 permissions, 148 role-permission assignments, 4 finance products, 30 asset categories, 75 asset types and 8 industries.
- Neon Preview currently has zero users, customers, applications, partner registrations, documents and audit events.
- Supabase bucket `oxford-customer-documents` is private, has a 10 MiB provider limit, allows PDF/JPEG/PNG and contains zero objects.
- Five legacy Supabase relational tables are RLS-enabled with no policies and contain zero rows. Neon remains the authoritative relational database.
- No migration-history table was found in Neon Preview.
- No explicit Neon snapshot schedule was found for the Preview or project default branch; no snapshots or restore test were verified.
- Preview application flag is enabled only on the approved Preview host for synthetic tests. Document uploads remain disabled. Preview email is restricted to the approved Oxford-owned mailbox. No Super Administrator account exists.
- Latest source commit and build state are recorded in [docs/RELEASE_READINESS.md](docs/RELEASE_READINESS.md).

## Release gates

1. Latest Cloudflare build must pass Vite, Wrangler type generation, TypeScript, full Vitest and ESLint.
2. Owner-controlled Super Administrator registration, email verification and one-time Preview bootstrap.
3. Full authentication lifecycle, PBKDF2 Worker benchmark and staff invitation/activation/expiry/revocation tests.
4. Seven-role direct-route and direct-server-function authorization matrix.
5. Eight Individual/Business × four finance-category application journeys.
6. Office intake, applicant claim, partner referral attribution, merchant linking and customer ownership tests.
7. Dummy document upload/download, MIME/signature/size/count validation, isolation, signed URL expiry, retry, cleanup and audit tests. Uploads remain disabled until all pass.
8. Brevo verification/recovery/queue/provider-failure tests to the approved Preview mailbox only.
9. Fee/VAT/settlement/reconciliation/adjustment and partner net-visibility acceptance. Payout execution remains disabled.
10. Neon migration baseline, repeatable migration procedure, independent backup and restore drill.
11. Changed-files-only format check, visual image confirmation, accessibility/responsive review and final security review.
12. Qualified review of POPIA, FICA, NCA, privacy notices, retention, complaints and business operating procedures.

## Finance amount and Oxford fee rules

- Principal loan amount is the amount requested by the applicant.
- Funder documentation fee: 1% of principal.
- VAT: 15% on principal plus the funder documentation fee.
- Total finance amount: `(principal + documentation fee) × 1.15`.
- Oxford facilitation and administration fees are separate partner-specific commercial terms. Do not add VAT again to Oxford fees.
- No universal default partner fee rates may be seeded or disclosed. An approved active terms version for the specific partner is required.

## Production boundary

No production deployment, production database migration, production secret change, DNS/custom-domain change, live application intake, document upload, customer/partner communication, settlement transfer or payout execution is permitted without separate explicit approval. Keep PR #9 draft and unmerged. Use synthetic identities and dummy documents only in Preview.

This plan records engineering delivery status. It is not legal or regulatory certification.
