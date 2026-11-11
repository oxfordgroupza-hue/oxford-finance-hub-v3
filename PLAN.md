# Oxford Finance Hub V3 — recovery and delivery plan

**Current state:** initial source import and remediation. Not production-ready.

The controlling reference is the V3 master project specification dated 10 November 2026. V2 and the legacy repository are recovery-only.

| Milestone | Scope | Current state |
|---|---|---|
| M0 | Repository recovery, comparison, sanitised import | In progress |
| M1 | Full audit, architecture and evidence register | Initial audit recorded; continue |
| M2 | Database/core domain and migrations | Source imported; validation pending |
| M3 | Identity provisioning and authentication | Preview-only Super Admin bootstrap requires an explicit server-side flag and verified Identity email; preview flag could not be set (Netlify environment update 403) and Identity endpoints return 404, so account provisioning remains externally blocked |
| M4 | Roles, permissions and Super Admin | Seven role templates and account-type ceilings are in source; end-to-end account/permission verification pending |
| M5 | Public site and customer application | Public pages and application route return 200 on Deploy Preview; application submission remains feature-gated pending auth and PII key configuration |
| M6 | Customer and Office lifecycle | Source imported; verification pending |
| M7 | Partner referrals, linking and Office intake | Own-referral scoping and registration-only notification are implemented; partner document access remains denied, supplier uploads are restricted to quote plus optional supporting files, and active partner account is revalidated for application referral attribution, linking and permission changes; end-to-end verification pending |
| M8 | Commercial fee model | Terms not approved; public rate logic removed and gated |
| M9 | Settlements and payouts | Gate remains closed |
| M10 | Internal credit assessment | Verified transaction evidence, statement periods, append-only reviewer classifications and versioned report snapshots are in source; five explicit reviewer outcomes and Individual/Business path capture added; end-to-end workflow verification pending |
| M11 | Private document storage | Supabase bucket exists and is private (10 MiB, PDF/JPEG/PNG); no anon/authenticated grants on sensitive tables; server secret key missing, so upload/download integration remains disabled |
| M12 | Notifications and automation | Delivery disabled; tests pending |
| M13 | Security and QA | Build, TypeScript, 116 tests across 20 files, ESLint and diff checks pass; API origin validation rejects unrelated Deploy Previews; partner referral/linking permissions revalidate active partner accounts; demo role visibility is restricted and tested; Supabase RLS is fail-closed; remaining configuration and performance findings tracked |
| M14 | Staging and acceptance | Deploy Preview ready and public route smoke tests passed; Identity is not enabled (404), so authenticated acceptance remains blocked |
| M15 | Production | Requires separate explicit approval |

## Acceptance evidence states
Use these exact distinctions: implemented in source; automated tests passing; Deploy Preview verified; real provider/account test verified; awaiting business approval; blocked by missing configuration/external action; not yet implemented.

## Release restrictions
No production deployment, live applications, document upload, email/WhatsApp delivery, settlement execution, payment or payout processing until separate approval and acceptance evidence are recorded. Legal and regulatory readiness requires qualified professional review.

## Latest verified checkpoint — 11 November 2026
- Source commit `aa1b99d62afa18df0a92733bf60b5d537dca4178` pushed to `fix/v3-desktop-validation-baseline`; PR #2 remains open and unmerged.
- Netlify Deploy Preview `6af410b14e6b981f3d4e444b` is ready with three functions deployed and no pending database migrations. M19 is already applied to this isolated branch.
- Desktop Commander HTTP smoke tests returned 200 for `/`, `/login`, `/apply`, `/office`, `/office/credit-assessments`, `/demo`, `/privacy` and `/terms`. Protected workspace routes return the login page as expected.
- The deployed document API returns 200 for the same preview origin and 403 for an unrelated Deploy Preview origin.
- Build, TypeScript, all 110 automated tests across 19 files, ESLint and `git diff --check` pass. The login page now reports Identity unavailability explicitly.
- Netlify Identity endpoints return 404 on this preview; Identity is dashboard-only. The preview bootstrap environment-variable update was rejected with HTTP 403, so real account provisioning remains blocked.
- Supabase's private document bucket is verified, but the server secret and PII encryption key are absent. Application, document-upload, email-delivery and settlement gates remain disabled.
- The primary Netlify site URL returns 404 (no production deploy is published). No production deploy, real applicant data, uploads, email, WhatsApp, settlements or payouts were enabled.
