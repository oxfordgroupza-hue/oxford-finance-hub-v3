# Oxford Finance Hub V3 — Deploy Preview Test Guide

**Preview:** https://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app/

**Branch:** `fix/v3-desktop-validation-baseline`  
**PR:** #2 — draft, not merged  
**Environment:** isolated Netlify Deploy Preview; no production release

## What can be tested now

1. Open the preview homepage and inspect the public navigation, layout, responsive presentation and page content.
2. Visit `/solutions`, `/partners`, `/about`, `/contact`, `/privacy`, `/terms`, `/popia` and `/complaints`.
3. Visit `/demo` and select each of the seven roles. All demo records are fictional. Simulate actions and refresh the page to confirm the local-only timeline resets.
4. Verify the demo access boundaries:
   - Customer: own applications only.
   - Partner: own linked referral only; no applicant-private documents or Oxford fee breakdown.
   - Customer support: support tickets only; no application or assessment records.
   - Office staff: applications created by that Office actor.
   - Application reviewer: assigned applications.
   - Administrator and Super Administrator: full demo oversight.

## Credit assessment implementation in the current recovery branch

The Office credit-assessment worksheet now captures separate Individual and Business financial inputs.

- Individual: net monthly income, living expenses, existing debt/repayment commitments and proposed monthly instalment.
- Business: monthly business income/receipts, operating expenses, existing business obligations, proposed monthly instalment, trading history and financial-statement evidence status.
- Each amount is classified as verified, applicant-declared or independently unverifiable. Only verified inputs enter the arithmetic; the source status and review flags remain in the saved report.
- Individual disposable income is calculated as verified net income less verified living expenses and existing commitments. Proposed-instalment headroom is shown separately.
- Business available cash flow is an interim reviewer calculation from verified monthly income less verified operating expenses and existing business obligations. It is not an approved lender formula or automated lending decision.
- Financial amounts in saved assessment report/version snapshots are encrypted. The scoring rules version is recorded.
- The 100-point weighting is configurable by the Super Administrator in the assessment rules panel. Saving creates an immutable draft version; activating it records the approver and makes it effective for new reports. Reports preserve the exact rules version and weights used.
- M20 creates the versioned rules table. No active ruleset is seeded; the initial template weights are not Oxford policy. A Super Administrator must review, save and explicitly approve the first ruleset before reviewers can save reports.
- Bank-statement reversals are still derived server-side from encrypted transaction candidates and the latest append-only human classifications. More than two verified reversals in the latest three calendar months triggers manual review, never automatic decline.

These features are implemented in source and covered by automated tests. Netlify Identity, private-storage verification and PII encryption are now configured in Deploy Preview, and Super Administrator Office directory access has been exercised. Full customer, partner, invitation, document, notification and financial-workflow acceptance remains outstanding. Do not enter real applicant information in this preview.

## Intentionally unavailable / not yet accepted

- `/apply` displays a pause notice. Do not enter or submit real personal, identity, banking or financial information.
- Netlify Identity is now configured: its settings endpoint returns HTTP 200, email authentication is enabled and email confirmation is required. The unauthenticated user endpoint returns HTTP 401.
- Super Administrator Office directory access has been exercised in the preview browser. This is not acceptance of all seven role workflows or all direct-function authorization boundaries.
- Real application submission and document upload remain disabled.
- Email, WhatsApp and finance-provider delivery have not completed controlled recipient acceptance; do not assume delivery works from configuration alone.
- Fee calculations, settlement execution and payouts remain gated pending approved commercial/remittance terms and separate release approval.

## Remaining configuration and acceptance work

The current preview health endpoint confirms the authoritative Netlify database, configured and verified private storage, and configured PII encryption. Do not rotate or replace these working secrets as part of routine testing. Continue only with isolated synthetic accounts and dummy documents:

1. Complete Customer and Partner signup, email confirmation, login, recovery and sign-out journeys.
2. Complete invitation create, resend/token rotation, wrong-email, expiry, revocation, one-time claim and concurrent-claim tests.
3. Complete partner-originated intake, claim, referral ownership and partner-isolation tests.
4. Complete all eight Individual/Business × finance-category application combinations after a separately approved Deploy Preview-only application flag change.
5. Complete role-by-role direct-route and direct-function authorization tests.
6. Complete private document upload/download, cross-customer and cross-partner denial, concurrency and interrupted-operation recovery after a separately approved Deploy Preview-only upload flag change.
7. Complete controlled notification delivery to an Oxford-owned preview inbox and provider failure/retry tests.
8. Complete synthetic credit-assessment and settlement-reconciliation tests without executing payments.

Do not enable any feature gate merely to make a test pass. Confirm the test plan and rollback conditions before changing a Deploy Preview flag.

## Release safeguards

- The primary Netlify site URL currently returns 404; no production deploy is published.
- PR #2 remains unmerged.
- No production database migration, live application, real document upload, outbound email/WhatsApp, provider submission, settlement or payout has been performed.
- The private Supabase bucket is not public. Do not add public read policies to make testing easier.
- Use fictional test records until the security and privacy acceptance checks are complete.
