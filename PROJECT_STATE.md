# Project State

## Mandatory platform policy (2026-11-27)
- **Cloudflare is Oxford's required default platform. Netlify is prohibited for new work and must not be recommended, selected, configured or used.** Netlify may only be considered where genuinely imperative and only with the user's explicit permission or direct request.
- Assess Cloudflare-native replacements for any function historically assigned to Netlify. Do not assume a one-to-one equivalent; verify capability, security, compatibility, cost and data handling.
- This policy does not authorise an automatic migration or production change. Existing dependencies remain until a safe replacement is implemented, tested and separately approved.
- The repository's PROJECT_OPERATING_STANDARD.md version 2.0 contains the full mandatory Cloudflare-first policy.

Last verified: 2026-11-27
Status: IN PROGRESS

## Identity
- Project: Oxford Finance Hub V3
- Purpose: Recovered V3 finance platform for individual and business finance applications, customer access and protected internal processing.
- Repository: https://github.com/oxfordgroupza-hue/oxford-finance-hub-v3
- Canonical production URL: https://finance.oxfordbusinessgroup.co.za (Cloudflare Worker hostname routing verified on 2026-11-27; application acceptance not implied).

## Source and deployment
- Working branch: main (repository default branch)
- Working commit: 82a2d1d5fd3e7c927c7cda202a920d523c03f491 (verified from GitHub branch endpoint on 2026-11-27; this is the state-record commit before this update).
- Deployment provider: [VERIFIED] Cloudflare Workers currently serves the Finance Hub production hostname. Cloudflare account records show finance.oxfordbusinessgroup.co.za routed to Worker oxford-finance-hub-v3-production, enabled=true, environment=production. A separate oxford-finance-hub-v3-preview Worker exists.
- Production Worker latest observed deployment: 2026-11-27T07:31:07Z, deployment id 2ddf7db3-50e3-4660-bc26-e09d39b4c2f3, version id 2d7ea9ca-a53d-4237-a23d-c4eac062a611 (version 35, 100% traffic). Version metadata identifies Wrangler as source but does not identify a Git commit or branch.
- Preview Worker latest observed deployment: 2026-11-27T07:26:41Z, deployment id 346b4c0e-6274-4b3f-ba31-050767ceca99, version id 6fc4fc2e-26bd-4665-919a-5523e08e34bc (version 91, 100% traffic). Version metadata identifies Wrangler as source but does not identify a Git commit or branch.
- Deployment source branch: UNRESOLVED. The repository contains multiple release, production and feature branches. The previously observed release/v3-production-2026-11-25 branch points to 43e0cbd80f5da5bc05ea5fc26f1ced516ae273b9, but no provider evidence links that commit to the currently active Worker version.
- Deployed commit: UNRESOLVED. Cloudflare Worker version metadata does not expose a Git commit SHA. Do not assume main or the older release branch was deployed.
- Preview URL: Not confirmed in this record.
- Production URL: [VERIFIED ROUTING] https://finance.oxfordbusinessgroup.co.za is configured as an enabled Cloudflare Worker domain for the production Worker. This verifies routing configuration, not a full end-to-end application acceptance test.
- Production changed during last session: NO

## Completed work
- [VERIFIED] Repository README identifies V3 as the authorised development target and says V2 and legacy repositories are read-only recovery references.
- [VERIFIED] README currently documents a Netlify-based target architecture, Supabase Storage for private application files only, and Brevo email disabled until acceptance tests pass. This documentation conflicts with the verified live Cloudflare Worker routing and must be reconciled before future deployment instructions are followed.
- [VERIFIED] Cloudflare account read confirms finance.oxfordbusinessgroup.co.za routes to the enabled oxford-finance-hub-v3-production Worker; a separate V3 preview Worker exists.
- [VERIFIED] Cloudflare reports the production Worker deployment on 2026-11-27 at 07:31:07Z and preview Worker deployment at 07:26:41Z. Both use Wrangler. Their version metadata does not expose the source Git commit or branch.
- [VERIFIED] README states real applications, uploads, transactional notifications, settlement processing and payouts remain disabled pending acceptance tests and separate approvals.
- [VERIFIED] PROJECT_OPERATING_STANDARD.md created on main in commit f3afca02a69379f1c872ecd5266306365c2be284 and read back successfully.
- [USER-REPORTED PASS] Registration, email verification and login tests were reported as successful in prior project work; underlying test evidence was not re-inspected in this session.

## Test register
| Test | Status | Date | Environment | Commit | Evidence |
|---|---|---|---|---|---|
| Registration, email verification and login | USER-REPORTED PASS | Earlier project session; exact date/commit not captured here | User test environment | Not captured | Prior conversation report |
| Hosting provider and production hostname routing | VERIFIED | 2026-11-27 | Cloudflare account configuration | Worker version 35 | Enabled hostname route maps finance.oxfordbusinessgroup.co.za to oxford-finance-hub-v3-production |
| Exact deployed Git branch and commit | BLOCKED | 2026-11-27 | Cloudflare Worker version metadata vs GitHub refs | — | Cloudflare identifies Wrangler as deployment source but does not expose Git commit/branch |
| Current production application and upload readiness | PENDING | — | Production | — | README documents these capabilities as disabled pending approval |
| Current build/CI acceptance suite | PENDING | — | Repository | — | Not run in this documentation-only session |

## Outstanding work
1. [BLOCKED] Identify the exact GitHub source branch and commit used to build the currently active Cloudflare production Worker. Do not infer it from the presence of release branches or from main HEAD.
2. [PENDING] Reconcile README architecture documentation with the verified Cloudflare production routing. Documentation correction should follow source/deployment provenance confirmation and must not trigger a deployment.
3. [PENDING] Inspect current CI and test evidence; do not repeat the user's successful authentication tests unless a relevant change or mismatch requires it.
4. [PENDING] Keep application processing, uploads and notifications disabled until their acceptance tests and separate approvals are complete.

## Confirmed defects and blockers
- [BLOCKED] Documentation/provenance discrepancy: README describes Netlify, while Cloudflare currently routes the production Finance Hub hostname to its V3 Worker. Cloudflare is verified as the active routing provider; exact source branch/commit remains unknown. No deployment action should be taken until provenance and documentation are reconciled.
- No new application defect established in this session.

## Integrations and configuration
- Netlify Identity and Netlify Database are described in the V3 README as the intended authentication and relational data services.
- Supabase Storage is documented for private application files only; Supabase Auth and Supabase relational tables are excluded by the README.
- Brevo is documented as disabled until controlled acceptance tests pass.
- [VERIFIED] Current Cloudflare routing maps finance.oxfordbusinessgroup.co.za to oxford-finance-hub-v3-production; the V3 preview Worker is also present. No secret values or applicant data were read or copied.
- Never request or store encryption keys, API keys, applicant data or private documents in this file.

## Recent changes
- 2026-11-27 — Created PROJECT_OPERATING_STANDARD.md, commit f3afca02a69379f1c872ecd5266306365c2be284.
- 2026-11-27 — Added this project state record. Documentation only; no application code, deployment, database, secrets, DNS or production settings changed.
- 2026-11-27 — Read-only reconciliation verified Cloudflare as the active production hostname routing provider and recorded current Worker deployment/version IDs. Exact Git source branch/commit remains unresolved. No platform or production settings changed.

## Next action
- Continue read-only provenance investigation to identify the GitHub commit/branch behind Cloudflare production version 35; then reconcile the README. Do not deploy or change provider configuration.
