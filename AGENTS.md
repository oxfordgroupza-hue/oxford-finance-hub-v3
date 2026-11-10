# Oxford Finance Hub V3 — mandatory project instructions

This repository is the sole authorised V3 development target for Oxford Finance Hub, Oxford Business Group (Pty) Ltd. The V3 master project specification dated 10 November 2026 is the controlling product, security, business-workflow and release reference.

## Repository boundaries
- Work only in `oxfordgroupza-hue/oxford-finance-hub-v3`.
- V2 and legacy repositories are read-only recovery references. Never push to them, merge their PRs, alter their branches or change their production settings.
- Preserve user changes. Never force-push, reset, clean or overwrite unreviewed work.
- Keep production/main branch protected. Work on focused recovery/feature branches and use expected-SHA updates.

## Security and privacy
- Never commit credentials, tokens, API keys, private keys, applicant PII, bank details, document contents, invitation tokens or confidential commercial fee schedules.
- The repository is public. Do not include internal commercial rates, margin calculations or confidential settlement terms in source, tests, fixtures or documentation.
- Do not reveal secrets in logs or reports. Report only whether required environment variables are present.
- Customer application ownership is separate from partner referral attribution. Partners must never receive applicant private-document access.
- Customer support roles do not receive application or document access by default.
- Server-side permission checks are mandatory for every protected read and mutation. UI hiding is not authorization.
- Keep document storage private. Do not use client-side Supabase service credentials or public buckets.
- Do not store identity numbers, financial PII or access tokens in localStorage.
- Never auto-approve/decline finance, infer a lender decision, grant permissions or execute payouts using AI.

## Provider architecture
- Netlify Identity: authentication.
- Netlify Database/PostgreSQL via Drizzle: authoritative relational application data.
- Supabase Storage: private files only.
- Brevo: transactional email only.
Do not migrate authentication, roles, permissions, applications, referrals or audit records to Supabase.

## Release gates
Keep applications, document uploads, email/WhatsApp delivery and settlements disabled until their specified tests and approvals are complete. Do not perform production deployments, database migrations, production environment changes, DNS/domain changes, real submissions, live uploads, payments or payouts without explicit approval.

## Engineering procedure
1. Inspect the current branch, status, history, instructions, scripts, migrations and relevant code.
2. Reproduce defects before changing code.
3. Add focused regression tests.
4. Make the smallest safe change and preserve existing business logic and UI.
5. Run build, typecheck, tests, lint and format checks; record actual results.
6. Review diffs for secrets, PII, confidential commercial terms, unsafe permissions and unrelated changes.
7. Record evidence and limitations. Never claim source presence proves end-to-end operation.
8. Keep recovery and release documentation current.

## Commercial terms
Settlement recording remains disabled pending explicit Oxford business approval. Public code may implement generic calculations only when rates are supplied through approved restricted server-side configuration. Never hardcode or disclose Oxford's confidential commercial terms.

## Documentation
Maintain README, PLAN, architecture, security, authentication, database, deployment, environment, testing, storage, notifications, commercial-terms governance, credit assessment, administrator guide, backup/recovery, changelog and known limitations. Do not claim legal or regulatory compliance without qualified professional review.
