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

These features are implemented in source and covered by automated tests. They have not yet been accepted end-to-end because Netlify Identity and the preview bootstrap are not available. Do not enter real applicant information in this preview.

## Intentionally unavailable

- `/apply` displays a pause notice. Do not enter or submit real personal, identity, banking or financial information.
- `/login` cannot complete authentication because Netlify Identity is not enabled for this site (Identity endpoints return 404).
- Protected Office, Admin, Partner and reviewer workflows cannot be accepted end-to-end until Identity and the preview Super Administrator bootstrap are configured.
- Real application submission and document upload are disabled.
- Email, WhatsApp and finance-provider delivery are disabled.
- Fee calculations, settlement execution and payouts remain gated pending approved commercial/remittance terms and separate release approval.

## Required configuration before authenticated acceptance

Configure these only in the **Deploy Preview** context unless a separate production release is formally approved:

1. Enable/configure Netlify Identity in the [V3 site's Identity settings](https://app.netlify.com/projects/oxford-finance-hub-v3-c28z/identity), including email confirmation and the intended administrator identity.
2. Add `OXFORD_INITIAL_SUPER_ADMIN_PREVIEW_BOOTSTRAP_ENABLED=true` as a Deploy Preview-only server/function environment variable. The automated environment-variable update was rejected with HTTP 403, so this remains a dashboard action.
3. Add a stable, high-entropy `OXFORD_PII_ENCRYPTION_KEY` as a server-only secret. Do not commit or share its value.
4. Add `SUPABASE_SECRET_KEY` as a server-only secret for the existing private `oxford-customer-documents` bucket. Do not expose it to browser code.
5. Only after Identity and PII encryption are verified, enable `OXFORD_APPLICATIONS_ENABLED=true` for Deploy Preview and test with synthetic records only.
6. Enable `OXFORD_DOCUMENT_UPLOADS_ENABLED=true` only after the private bucket access path, authorization, file validation, encryption and download controls pass end-to-end tests.
7. Configure email delivery separately and keep WhatsApp/provider delivery off until their credentials and test workflows are verified.

## Release safeguards

- The primary Netlify site URL currently returns 404; no production deploy is published.
- PR #2 remains unmerged.
- No production database migration, live application, real document upload, outbound email/WhatsApp, provider submission, settlement or payout has been performed.
- The private Supabase bucket is not public. Do not add public read policies to make testing easier.
- Use fictional test records until the security and privacy acceptance checks are complete.
