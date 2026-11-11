# Oxford Finance Hub V3

Oxford Finance Hub is the finance-intermediary platform of Oxford Business Group (Pty) Ltd, operating in South Africa.

**This is a recovery and development repository, not a production release.** The authoritative project specification is the Oxford Finance Hub V3 master project recovery and release specification dated 10 November 2026.

## Architecture

- Netlify: hosting, Deploy Previews, Identity, PostgreSQL/Netlify Database and server functions.
- Supabase Storage: private application documents only.
- Brevo: transactional email only after controlled acceptance and approval.
- Netlify Identity and Netlify Database remain authoritative for authentication, roles, permissions, application ownership and workflow records.

## Current staging status — 11 November 2026

[Open the V3 Deploy Preview](https://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app/)

The preview is not a production release. Public-route smoke tests and the credit-assessment route bundle pass. M20 is applied to the isolated preview database branch. The Individual/Business affordability workflow and versioned Super Administrator scoring rules are in source; no active ruleset is seeded.

Netlify Identity is not enabled for V3, and the preview environment-variable write is blocked. The PII encryption key and Supabase server secret are not configured, so live application submission, document upload/download and authenticated acceptance remain disabled. See [the current recovery checkpoint](PLAN.md) for exact evidence and blockers.

## Safety

Production deployment, migrations, live applications, real document uploads, external notifications and settlement processing require separate approval. Settlement terms are intentionally not embedded in this public repository. Never commit credentials, secrets, applicant information, document contents or confidential commercial rates.

See [recovery findings](docs/recovery/M0-INITIAL-FINDINGS.md), [recovery baseline](docs/architecture/RECOVERY-BASELINE.md), [project plan](PLAN.md) and [contributor rules](AGENTS.md).
