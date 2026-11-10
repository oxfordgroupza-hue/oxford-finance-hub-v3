# Security and privacy baseline

- Public repository: no secrets, applicant PII, identity numbers, bank details, document contents or confidential fee schedules.
- Authentication: Netlify Identity; all workspace authorization is resolved and enforced server-side.
- Authoritative relational records: Netlify Database/PostgreSQL via Drizzle.
- Files: private Supabase Storage bucket, accessed only through server-side authorization.
- Partners: own referral records and permitted supplier uploads only; no applicant-private document listing or download.
- Support staff: support permissions only unless separately approved.
- PII encryption: server-only encryption module; key is a server-only secret and must never be exposed to client bundles.
- Audit sensitive actions without storing secrets, tokens or document contents in audit details.
- Feature gates default off for application submission, document uploads, email delivery and settlements.
- No AI approval/decline, role grants or payout execution.
- POPIA/FICA/NCA readiness and compliance claims require qualified professional review.

This document records engineering controls, not legal certification or a guarantee of compliance.
