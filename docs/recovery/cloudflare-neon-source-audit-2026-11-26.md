# Oxford Finance Hub V3 — Cloudflare/Neon source recovery audit

**Audit date:** 26 November 2026  
**Purpose:** Record verified source-provenance findings before reconstructing the authorised V3 application repository.  
**Scope:** Read-only inspection of V3, V2 branches, and the deployed Cloudflare production Worker. No production settings, databases, storage objects, secrets, or feature flags were changed.

## Executive finding

The authorised V3 repository does not yet contain the application source. Its default branch contains only the recovery README and its initialisation commit. The deployed production Worker is a compiled application bundle, not a recoverable source repository. The V2 repositories contain substantial earlier application source, but their checked-in instructions designate them as read-only and their runtime architecture is Netlify-based. Therefore, copying V2 source directly into V3 or deploying it would be unsafe.

## Verified repository provenance

### V3 authorised target

- Repository: `oxfordgroupza-hue/oxford-finance-hub-v3`
- Default branch: `main`
- Initial commit: `bb022756e4a979cbf64d39c07405176e29b0abba`
- Default branch currently contains only `README.md`.
- The README identifies V3 as the authorised development target and states that V2/legacy repositories are read-only recovery references.
- The README's architecture description is stale: it still refers to Netlify hosting/authentication/database. It must not be treated as a description of the current production runtime.

### V2 recovery commit named in the V3 README

- Repository: `oxfordgroupza-hue/oxford-finance-hub-v2`
- Commit: `183ea2117d4be9a587a1632f68e8245091a72897`
- Commit message: `Navigate after browser Identity login to send session cookie`
- This commit changes only `src/routes/login.tsx`, switching the post-login flow to a full navigation to `/dashboard` because Netlify Identity sets the `nf_jwt` cookie.
- It is not a complete application baseline and is explicitly tied to Netlify Identity.

### V2 approved workflow branch

The V2 `AGENTS.md` designates `feat/oxford-application-workflows` as the working branch for its approved workflow additions and instructs contributors not to modify other branches or repositories. The approved workflow record is `docs/implementation/approved-workflow-additions-2026-11-10.md`. It contains important product requirements for applicant ownership, office-created applications, partner referrals, applicant/partner document permissions, internal bureau-independent assessment, debit-order reversal review, human decision authority, commercial terms, and audit controls.

Those requirements are useful as product provenance, but the branch is not an authorised deployment source for the current Cloudflare/Neon runtime. The V2 instructions say not to merge/deploy or alter production without separate approval.

### Newer V2 preview branch

The V2 `migration/supabase-staging` branch includes later application-wizard preview changes (head commit `befca34f5e730a263d78edd48ee9992a0fccd5be`). Its tree still contains `netlify.toml`, `netlify/functions`, Netlify database migrations, and Netlify Identity code. Its `/apply` change exposes the wizard only in isolated Deploy Previews and keeps production application intake paused. It is not a Cloudflare/Neon source baseline.

## Verified deployed runtime architecture

Read-only inspection of Cloudflare Worker `oxford-finance-hub-v3-production` found:

- Production entrypoint is a compiled `index.js` bundle.
- The uploaded Worker content contains 136 multipart modules (approximately 4 MB); no source-map modules were present in the inspected upload.
- A compiled Cloudflare runtime module reads the `HYPERDRIVE` binding and uses Drizzle/PostgreSQL. Other compiled modules explicitly identify the authoritative database as `neon`.
- Private document storage uses the existing Supabase Storage bucket `oxford-customer-documents` through server-only configuration.
- The deployed bundle includes application, office, invitation, PDF-pack, access-control and catalogue modules.
- Some compiled modules still contain stale Netlify wording, including fail-closed comments and an office notification setup message. These are source-cleanup defects, not evidence that the production runtime still uses Netlify.
- Production application submission and document upload safeguards remain disabled. Do not enable them during source recovery.

No secret values, tokens, applicant records, or document contents were retrieved or included in this audit.

## Safe recovery plan

1. Preserve V2 and legacy repositories as read-only.
2. Recover the original TypeScript source from an authorised export, local source checkout, build artefact with source content, or other verifiable source archive. The compiled Worker alone is not an acceptable maintainable source baseline.
3. Reconcile the recovered source with the deployed Worker architecture: Cloudflare Workers, Hyperdrive to Neon, and private Supabase Storage. Do not reintroduce Netlify runtime dependencies.
4. Reconcile the source against the approved V2 workflow record and the current V3 project specification, while preserving the current V3-specific UI, security controls and release gates.
5. Rebuild the V3 source tree on a dedicated V3 branch. Add automated tests for schema compatibility, authentication/roles, applicant isolation, partner ownership, document permissions, audit trails and fail-closed production flags.
6. Compare the rebuilt bundle and routes against the deployed Worker before any deployment. Keep production application intake and uploads disabled until controlled acceptance tests pass.
7. Remove stale Netlify references from V3 source and generated output, then add CI checks that reject obsolete hosting references.
8. Keep Brevo, WhatsApp and HubSpot work deferred to the final integration stage, as instructed by the owner.

## Current status

**Source recovery is blocked by missing authoritative source files in the V3 repository.** The available V2 source is valuable for requirements and historical implementation, but its explicit read-only and Netlify-specific instructions prohibit treating it as a drop-in production source. No application source was fabricated, no production deployment was attempted, and no safeguards were weakened.
