## Current-state addendum — 26 November 2026

The bounded multipart parser is now included in the current successful Cloudflare Build and Preview deployment (branch head `045d5b1`). The 25 November statement that this build was still pending is historical.

Current source review also confirms transactional customer registration, transactional recovery-challenge replacement, atomic SQL failed-login increments, and implemented staff invitation creation/acceptance handlers plus the activation route. The Cloudflare Preview intake gate is host-restricted and feature-flagged. Older review notes describing these source items as absent are stale; their full end-to-end acceptance remains open.

Production is not untouched: the restricted Worker and finance custom domain are already attached. Applications and document uploads remain disabled. The Neon production branch has no automatic snapshot schedule or accepted restore drill.
---

# V3 known issues and release blockers

**Release status: not ready for production.**

## Runtime and integration

- Cloudflare-native auth code is present and unit-tested, but signup, email verification, recovery, login/logout, session revocation and bootstrap have not completed end-to-end acceptance.
- No Super Administrator account exists in Preview. Initial bootstrap is allow-listed to the approved Oxford-owned mailbox.
- PBKDF2 Worker runtime performance has not been benchmarked.
- Staff invitation/activation requires end-to-end verification.
- Supabase health and private bucket verification pass; uploads remain disabled and no files have been uploaded.
- Brevo secret/sender configuration exists in Preview; no email has been sent.
- Neon backup/restore has not been tested; no explicit snapshot schedule was found.

## Workflow acceptance

- Seven roles and 90 permission keys exist in the catalogue; the full route/server-function isolation matrix is not accepted.
- The eight Individual/Business × four finance-category application combinations have not completed end-to-end tests.
- Office-created intake, partner referral attribution, merchant linking and customer claim lifecycle remain unverified.
- Fee/VAT/settlement calculations require final business-term acceptance; no settlement or payout execution is enabled.
- Credit assessment must remain a human review aid; no automated approval/decline or bureau claim is permitted.

## Quality

- Latest source build passed 39 test files / 216 tests, TypeScript and ESLint (0 errors, 2 generated-file warnings).
- Changed-files-only Prettier check remains outstanding.
- Responsive smoke checks found no horizontal overflow. The prior image paths were broken; source now imports local assets and deployment 61 includes the bundled files. Final browser visual confirmation remains outstanding due temporary browser-rendering service rate limiting.
- Qualified legal/compliance review of POPIA, FICA, NCA, privacy notices, retention and complaints is outstanding.

## Production controls

PR #9 remains draft and unmerged. The production Worker, finance custom domain and production Neon branch are already present. Production application intake and document uploads remain disabled; no further production changes without separate approval. Production release requires separate explicit approval.
