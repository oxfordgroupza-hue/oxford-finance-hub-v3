# Oxford Finance Hub V3 — Project State

Last verified: 2026-11-28
Status: IN PROGRESS

## Identity
- Project: Oxford Finance Hub V3
- Purpose: Finance facilitation platform for individual and business finance applications, partner referrals and office administration.
- Repository: https://github.com/oxfordgroupza-hue/oxford-finance-hub-v3
- Canonical production URL: https://finance.oxfordbusinessgroup.co.za

## Source and deployment
- Working branch: `feature/finance-provider-disclosures-2026-11-28-review`
- Working commit: `173771ce3c6b8803b291ede19c84e96bc33f99cb` (operating standard added; disclosure work not yet committed)
- Source baseline for this task: `feature/finance-hub-contact-details-production-2026-11-27` at `31256fad65a68980496449a64de845c9758418ce`
- Deployment provider: Cloudflare Workers
- Production Worker: `oxford-finance-hub-v3-production`
- Production deployment ID: `2ddf7db3-50e3-4660-bc26-e09d39b4c2f3`
- Production version ID: `2d7ea9ca-a53d-4237-a23d-c4eac062a611` (created 2026-11-27 07:31 UTC)
- Production source branch/commit: NOT EXACTLY PROVEN. The deployed source map's Git blob hashes match 5/5 key application files on the baseline branch and 113/127 tracked source files overall. The 14 differences are 13 image assets and `src/components/site/SiteLayout.tsx`; two generated source files are not tracked in the repository tree. This strongly establishes V3 lineage but is not an exact full-tree commit match.
- Preview target: Cloudflare Worker `oxford-finance-hub-v3-preview`; exact preview deployment for this feature branch not yet created.
- Production changed during this session: NO.

## Completed work
- [VERIFIED] Read-only comparison of deployed production source maps with V3 Git blob hashes identified the V3 code lineage. The deployed auth source exactly matches `src/lib/auth.ts` on `cleanup/cloudflare-only-runtime`, `cleanup/cloudflare-only-platform`, `launch/v3-reconciled-2026-11-26`, `release/candidate-submit-optimisation-2026-11-26`, and `feature/finance-hub-contact-details-production-2026-11-27`.
- [VERIFIED] The production source's `src/lib/finance-config.ts`, `src/routes/terms.tsx`, `src/components/application/ApplicationWizard.tsx` and `src/components/site/SiteFooter.tsx` exactly match the respective files on baseline commit `31256fad65a68980496449a64de845c9758418ce`.
- [VERIFIED] This isolated feature branch was created from baseline commit `31256fad65a68980496449a64de845c9758418ce`.
- [VERIFIED] Oxford Project Operating Standard v2.0 was copied into this repository without changing runtime configuration.

## Test register
| Test | Status | Date | Environment | Commit | Evidence |
|---|---|---|---|---|---|
| Deployed Worker source-map inspection | VERIFIED | 2026-11-28 | Cloudflare production, read-only | deployment version `2d7ea9ca-a53d-4237-a23d-c4eac062a611` | Embedded source-map Git blob hashes |
| Key V3 source-file comparison | VERIFIED | 2026-11-28 | GitHub repository vs deployed Worker bundle | `31256fad65a68980496449a64de845c9758418ce` | 5/5 key source files match |
| Full source-tree comparison | PENDING | 2026-11-28 | GitHub repository vs deployed Worker bundle | same baseline | 113/127 tracked sources match; 14 differences require explanation |
| Disclosure change build/typecheck/tests/lint | PENDING | 2026-11-28 | Local/Cloudflare preview | feature branch | Not run |
| Visual/browser review | PENDING | 2026-11-28 | Non-production preview | feature branch | Not run |

## Outstanding work
1. [PENDING] Refine footer, Terms and provider-sharing consent wording in the verified V3 source lineage, without changing consent requirements or application behaviour.
2. [PENDING] Run build, typecheck, unit tests, lint, format and diff/security checks on the feature branch.
3. [PENDING] Establish a Cloudflare-native, non-production preview build for visual review; no Netlify deployment.
4. [PENDING] Explain the remaining source-map differences (13 image assets, SiteLayout and generated source files) before claiming exact production commit provenance.
5. [PENDING] Obtain qualified South African legal review of the final finance disclosures and related privacy/consent wording before publication.

## Confirmed defects and blockers
- [BLOCKED] The exact full Git commit that produced the live Worker has not been proven, despite strong V3 source-lineage evidence.
- [PENDING] The repository does not yet contain a `PROJECT_STATE.md` or this standard on all branches; this state is maintained on the isolated feature branch only.
- [PENDING] Existing project docs contain historical Netlify references. Treat them as legacy; Oxford Project Operating Standard v2.0 requires Cloudflare and prohibits new Netlify use.
- [VERIFIED] Production Worker settings observed earlier: applications disabled, document uploads disabled, email delivery enabled. No setting was changed in this session.

## Integrations and configuration
- Cloudflare Workers — production Worker and preview Worker exist.
- Neon PostgreSQL via Hyperdrive — V3 authoritative relational data architecture.
- Supabase Storage — private document storage; uploads remain disabled.
- Brevo — transactional email integration; delivery acceptance remains pending.
- No secret values are recorded here.

## Recent changes
- 2026-11-28 — Created isolated disclosure review branch from `31256fad65a68980496449a64de845c9758418ce`.
- 2026-11-28 — Added Oxford Project Operating Standard v2.0 — `173771ce3c6b8803b291ede19c84e96bc33f99cb`.

## Next action
- Update the V3 footer disclosure, Terms wording and provider-sharing consent label on this isolated branch; preserve all existing consent-required flags and runtime behaviour.
