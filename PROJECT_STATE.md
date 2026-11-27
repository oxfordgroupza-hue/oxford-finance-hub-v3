# Project State

Last verified: 2026-11-27
Status: IN PROGRESS

## Identity
- Project: Oxford Finance Hub V3
- Purpose: Recovered V3 finance platform for individual and business finance applications, customer access and protected internal processing.
- Repository: https://github.com/oxfordgroupza-hue/oxford-finance-hub-v3
- Canonical production URL: Intended target is https://finance.oxfordbusinessgroup.co.za; live production status is not confirmed by the repository README.

## Source and deployment
- Working branch: main (repository default branch)
- Working commit: Project operating-standard commit f3afca02a69379f1c872ecd5266306365c2be284 is confirmed; current branch HEAD not rechecked in this session.
- Deployment provider: UNRESOLVED. README describes a Netlify target architecture; earlier infrastructure inspection recorded Cloudflare Workers named oxford-finance-hub-v3-preview and oxford-finance-hub-v3-production. These sources conflict and must be reconciled before any deployment work.
- Deployment source branch: UNRESOLVED. Earlier infrastructure inspection recorded release/v3-production-2026-11-25; do not assume this remains current.
- Deployed commit: UNRESOLVED. Earlier infrastructure inspection recorded 43e0cbd80f5da5bc05ea5fc26f1ced516ae273b9; recheck before relying on it.
- Preview URL: Not confirmed in this record.
- Production URL: Intended finance.oxfordbusinessgroup.co.za; do not assume V3 is serving production.
- Production changed during last session: NO

## Completed work
- [VERIFIED] Repository README identifies V3 as the authorised development target and says V2 and legacy repositories are read-only recovery references.
- [VERIFIED] README documents a Netlify-based target architecture, Supabase Storage for private application files only, and Brevo email disabled until acceptance tests pass.
- [VERIFIED] README states real applications, uploads, transactional notifications, settlement processing and payouts remain disabled pending acceptance tests and separate approvals.
- [VERIFIED] PROJECT_OPERATING_STANDARD.md created on main in commit f3afca02a69379f1c872ecd5266306365c2be284 and read back successfully.
- [USER-REPORTED PASS] Registration, email verification and login tests were reported as successful in prior project work; underlying test evidence was not re-inspected in this session.

## Test register
| Test | Status | Date | Environment | Commit | Evidence |
|---|---|---|---|---|---|
| Registration, email verification and login | USER-REPORTED PASS | Earlier project session; exact date/commit not captured here | User test environment | Not captured | Prior conversation report |
| Current deployment source and active architecture | BLOCKED | 2026-11-27 | Provider configuration vs repository | — | README and earlier infrastructure inspection disagree |
| Current production application and upload readiness | PENDING | — | Production | — | README documents these capabilities as disabled pending approval |
| Current build/CI acceptance suite | PENDING | — | Repository | — | Not run in this documentation-only session |

## Outstanding work
1. [BLOCKED] Reconcile the README's Netlify architecture with the previously inspected Cloudflare Workers and deployment branch. Verify the live provider and deployment source before making any technical changes.
2. [PENDING] Capture current main HEAD, active release branch, provider deployment commit and preview/production URLs.
3. [PENDING] Inspect current CI and test evidence; do not repeat the user's successful authentication tests unless a relevant change or mismatch requires it.
4. [PENDING] Keep application processing, uploads and notifications disabled until their acceptance tests and separate approvals are complete.

## Confirmed defects and blockers
- [BLOCKED] Deployment architecture/source discrepancy: repository README and earlier provider inspection do not agree. No deployment action should be taken until resolved.
- No new application defect established in this session.

## Integrations and configuration
- Netlify Identity and Netlify Database are described in the V3 README as the intended authentication and relational data services.
- Supabase Storage is documented for private application files only; Supabase Auth and Supabase relational tables are excluded by the README.
- Brevo is documented as disabled until controlled acceptance tests pass.
- Earlier provider inspection recorded Cloudflare Worker configuration and secret bindings; values are not copied into this record.
- Never request or store encryption keys, API keys, applicant data or private documents in this file.

## Recent changes
- 2026-11-27 — Created PROJECT_OPERATING_STANDARD.md, commit f3afca02a69379f1c872ecd5266306365c2be284.
- 2026-11-27 — Added this project state record. Documentation only; no application code, deployment, database, secrets, DNS or production settings changed.

## Next action
- Read current Cloudflare and Netlify project configuration side by side and establish which platform/branch actually serves V3. Do not change either platform while investigating.
