# Project State

## Mandatory platform policy (2026-11-27)
- **Cloudflare is Oxford's required default platform. Netlify is prohibited for new work and must not be recommended, selected, configured or used.** Netlify may only be considered where genuinely imperative and only with the user's explicit permission or direct request.
- Assess Cloudflare-native replacements for any function historically assigned to Netlify. Do not assume a one-to-one equivalent; verify capability, security, compatibility, cost and data handling.
- This policy does not authorise an automatic migration or production change. Existing dependencies remain until a safe replacement is implemented, tested and separately approved.
- The repository's PROJECT_OPERATING_STANDARD.md version 2.0 contains the full mandatory Cloudflare-first policy.

Last verified: 2026-11-28
Status: IN PROGRESS

## Identity
- Project: Oxford Finance Hub V3
- Purpose: Recovered V3 finance platform for individual and business finance applications, customer access and protected internal processing.
- Repository: https://github.com/oxfordgroupza-hue/oxford-finance-hub-v3
- Canonical production URL: https://finance.oxfordbusinessgroup.co.za (Cloudflare Worker hostname routing verified on 2026-11-27; application acceptance not implied).

## Source and deployment
- Working branch: feature/finance-provider-disclosures-2026-11-28
- Working commit: b459aceefa42b04d3cf63243025dbc396e0fbf59 (latest application-code commit before project-record files were added).
- Deployment provider: [VERIFIED] Cloudflare Workers currently serves the Finance Hub production hostname. Cloudflare account records show finance.oxfordbusinessgroup.co.za routed to Worker oxford-finance-hub-v3-production, enabled=true, environment=production. A separate oxford-finance-hub-v3-preview Worker exists.
- Production Worker latest observed deployment: 2026-11-27T07:31:07Z, deployment id 2ddf7db3-50e3-4660-bc26-e09d39b4c2f3, version id 2d7ea9ca-a53d-4237-a23d-c4eac062a611 (version 35, 100% traffic). Version metadata identifies Wrangler as source but does not identify a Git commit or branch.
- Preview Worker latest observed deployment: 2026-11-27T07:26:41Z, deployment id 346b4c0e-6274-4b3f-ba31-050767ceca99, version id 6fc4fc2e-26bd-4665-919a-5523e08e34bc (version 91, 100% traffic). Version metadata identifies Wrangler as source but does not identify a Git commit or branch.
- Deployment source branch: [VERIFIED BY SOURCE MATCH] fix/finance-hub-whatsapp-reference-format.
- Deployed commit: [VERIFIED BY SOURCE MATCH] 464a26aaa0a2157b1fda3abd0e90f2eb1640891a. Cloudflare metadata itself reports Wrangler and has no Git SHA; embedded Worker source maps match this commit's application source files.
- Preview URL: Not confirmed in this record.
- Production URL: [VERIFIED ROUTING] https://finance.oxfordbusinessgroup.co.za is configured as an enabled Cloudflare Worker domain for the production Worker. This verifies routing configuration, not a full end-to-end application acceptance test.
- Production changed during last session: NO

## Completed work
- [VERIFIED] Current feature branch is based on the exact source commit identified for the live V3 production Worker: `464a26aaa0a2157b1fda3abd0e90f2eb1640891a`.
- [VERIFIED] Finance Hub disclosure and marketing-positioning changes are committed on this branch through `b459aceefa42b04d3cf63243025dbc396e0fbf59` across `finance-config.ts`, Terms, application consent/confirmation, footer, homepage, Solutions and About pages.
- [VERIFIED] Applicant consent required/optional flags and application submission/security logic were not changed.
- [VERIFIED] Preview Neon `site_content` contains published overrides for `home.hero.eyebrow`, `home.hero.intro` and `solutions.hero.intro`; the current values still contain the previous intermediary-focused wording. These rows override the new source fallbacks.
- [VERIFIED] No Neon data was changed. Explicit user approval is required before editing the three Preview content rows; Production database remains untouched.
- [PENDING] Build, typecheck, tests and lint have not been run on this feature branch. The repository validation workflow is manual-only and the project records GitHub-hosted runner billing restrictions; do not dispatch it without explicit approval or a confirmed free execution path.

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
| Exact deployed Git branch and commit | VERIFIED | 2026-11-28 | Cloudflare source maps vs GitHub V3 tree | 464a26aaa0a2157b1fda3abd0e90f2eb1640891a | 116 non-image application source files matched exactly; preview independently matched 115 non-image files |
| Current production application and upload readiness | PENDING | — | Production | — | README documents these capabilities as disabled pending approval |
| Current build/CI acceptance suite | PENDING | — | Repository | — | Not run in this documentation-only session |

## Outstanding work
1. [VERIFIED] Production Worker source identified by exact source-content comparison: fix/finance-hub-whatsapp-reference-format @ 464a26aaa0a2157b1fda3abd0e90f2eb1640891a. Keep the source match evidence and do not infer deployment provenance from branch labels alone.
2. [PENDING] Reconcile README architecture documentation with the verified Cloudflare production routing. Documentation correction should follow source/deployment provenance confirmation and must not trigger a deployment.
3. [PENDING] Inspect current CI and test evidence; do not repeat the user's successful authentication tests unless a relevant change or mismatch requires it.
4. [PENDING] Keep application processing, uploads and notifications disabled until their acceptance tests and separate approvals are complete.

## Confirmed defects and blockers
- [VERIFIED] Documentation discrepancy: V3 main README still describes Netlify as target architecture, while the deployed V3 source branch AGENTS.md and Worker source implement Cloudflare-native auth/runtime. Exact deployed source commit is now verified by source-content matching. Reconcile documentation before further release instructions are followed.
- No new application defect established in this session.

## Integrations and configuration
- [VERIFIED IN SOURCE BRANCH] Cloudflare Workers — hosting and server-side runtime; Oxford-owned Cloudflare-native authentication; Neon PostgreSQL via Cloudflare Hyperdrive as the documented authoritative relational database; Supabase Storage for private application files; Brevo for transactional email. Production feature gates remain as recorded below.
- Main README still has stale Netlify architecture text; it is not authoritative over the V3 source branch AGENTS.md and deployed source fingerprint.
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

## CI investigation update — 2026-11-27
- [VERIFIED] Latest observed workflow run in the inspected Actions list: run 45947440335, workflow "Recover V3 baseline and implement contact details", main, commit a5fc584b8ef4eb2840fd7f11cea6091e6f79706b. It concluded failure.
- [VERIFIED] Its job record started and completed within approximately two seconds, has runner_id=0, runner_name empty, and contains zero steps. The job log endpoint returned no retrievable log artifact. This points to a runner/job startup failure before workflow steps executed; it does not establish an application-code failure.
- [VERIFIED] The workflow definition at that run's commit includes checkout, source import, code generation and pnpm validation steps. None of those steps ran according to the job record.
- [PENDING] Root cause of the runner startup failure remains unknown. Do not rerun or alter workflow definitions without approval.


## Worker source provenance resolved — 2026-11-28
- [VERIFIED] The active production Worker bundle was downloaded read-only from Cloudflare and its embedded source maps were parsed. The 116 non-image application source files match the Git blobs at V3 commit `464a26aaa0a2157b1fda3abd0e90f2eb1640891a` exactly. The matching branch is `fix/finance-hub-whatsapp-reference-format`.
- [VERIFIED] The preview Worker bundle was independently downloaded and all 115 non-image application source files matched the same commit exactly. Generated `src/routeTree.gen.ts` and binary/image assets were excluded from the source-code fingerprint comparison.
- [VERIFIED] Commit `464a26aaa0a2157b1fda3abd0e90f2eb1640891a` was authored/committed 2026-11-27 07:21:58 UTC. Cloudflare production deployment `2ddf7db3-50e3-4660-bc26-e09d39b4c2f3`, version `2d7ea9ca-a53d-4237-a23d-c4eac062a611`, was created 2026-11-27 07:31:07 UTC (Wrangler source). Preview deployment `346b4c0e-6274-4b3f-ba31-050767ceca99`, version `6fc4fc2e-26bd-4665-919a-5523e08e34bc`, was recorded at 07:26:41 UTC.
- [VERIFIED] The Worker deployment API still does not expose a Git commit SHA. The source attribution above is based on exact source-content hashes across the deployed source maps, not deployment metadata.
- [VERIFIED] V3 main currently points to `e72218692bba46a46755e5e8fde7ea510c6a47a6`; it is not the deployed source commit. The main README still contains stale Netlify target-architecture wording. The V3 source branch AGENTS.md describes the Cloudflare/Neon/Supabase architecture, but that branch does not contain PROJECT_STATE.md or PROJECT_OPERATING_STANDARD.md.
- [VERIFIED] The V3 production and preview Worker application source is therefore now traceable to the identified V3 source commit. No Worker, deployment, DNS, database, secret, feature-flag or customer data was changed.
- [PENDING] Reconcile the stale V3 main README/project documentation with the Cloudflare-first policy and preserve a current project state on the active development branch before further feature work.
- [PENDING] Review and implement the previously approved finance disclosure wording on a new feature branch based on the verified source commit; do not merge or deploy without explicit approval.


## Finance disclosure feature branch — 2026-11-28
- Working branch: `feature/finance-provider-disclosures-2026-11-28`, based on verified production source commit `464a26aaa0a2157b1fda3abd0e90f2eb1640891a`.
- Latest application-code commit: `b459aceefa42b04d3cf63243025dbc396e0fbf59`.
- Changed source files: `src/lib/finance-config.ts`, `src/routes/terms.tsx`, `src/components/application/ApplicationWizard.tsx`, `src/components/site/SiteFooter.tsx`, `src/routes/solutions.tsx`, `src/routes/index.tsx`, `src/routes/about.tsx`.
- Footer, Solutions, About, homepage fallbacks, Terms, provider-sharing consent and application confirmation now use the Finance Hub brand and clarify provider assessment/decision responsibility in discreet locations.
- Preview database overrides remain unchanged. Published values currently contain the previous wording and override the updated homepage/Solutions fallbacks.
- Tests/build not run. No preview Worker deployment, Production Worker deployment, database mutation, feature-flag change or DNS change occurred.
