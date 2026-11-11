# Oxford Finance Hub V3 — recovery and delivery plan

**Current state:** initial source import and remediation. Not production-ready.

The controlling reference is the V3 master project specification dated 10 November 2026. V2 and the legacy repository are recovery-only.

| Milestone | Scope | Current state |
|---|---|---|
| M0 | Repository recovery, comparison, sanitised import | In progress |
| M1 | Full audit, architecture and evidence register | Initial audit recorded; continue |
| M2 | Database/core domain and migrations | Source imported; validation pending |
| M3 | Identity provisioning and authentication | Preview-only Super Admin bootstrap now requires an explicit server-side flag and verified Identity email; Netlify Identity provider availability still requires live preview verification |
| M4 | Roles, permissions and Super Admin | Seven role templates and account-type ceilings are in source; end-to-end account/permission verification pending |
| M5 | Public site and customer application | Public pages and application route return 200 on Deploy Preview; application submission remains feature-gated pending auth and PII key configuration |
| M6 | Customer and Office lifecycle | Source imported; verification pending |
| M7 | Partner referrals, linking and Office intake | Partner isolation corrections required |
| M8 | Commercial fee model | Terms not approved; public rate logic removed and gated |
| M9 | Settlements and payouts | Gate remains closed |
| M10 | Internal credit assessment | Verified transaction evidence, statement periods, append-only reviewer classifications and versioned report snapshots are in source; five explicit reviewer outcomes and Individual/Business path capture added; end-to-end workflow verification pending |
| M11 | Private document storage | Supabase bucket exists and is private (10 MiB, PDF/JPEG/PNG); no anon/authenticated grants on sensitive tables; server secret key missing, so upload/download integration remains disabled |
| M12 | Notifications and automation | Delivery disabled; tests pending |
| M13 | Security and QA | Build, TypeScript, 108 tests, ESLint and diff checks pass; API origin validation now rejects requests from unrelated Deploy Previews; Supabase RLS is fail-closed; remaining configuration and performance findings tracked |
| M14 | Staging and acceptance | Deploy Preview ready and public route smoke tests passed; Identity is not enabled (404), so authenticated acceptance remains blocked |
| M15 | Production | Requires separate explicit approval |

## Acceptance evidence states
Use these exact distinctions: implemented in source; automated tests passing; Deploy Preview verified; real provider/account test verified; awaiting business approval; blocked by missing configuration/external action; not yet implemented.

## Release restrictions
No production deployment, live applications, document upload, email/WhatsApp delivery, settlement execution, payment or payout processing until separate approval and acceptance evidence are recorded. Legal and regulatory readiness requires qualified professional review.

## Latest verified checkpoint — 11 November 2026
- Source commit `1409ae695dc3038b37759b6e8e89336e2d93d0f3` pushed to `fix/v3-desktop-validation-baseline`; PR #2 remains open.
- Netlify Deploy Preview `6af40d534210a5c82f39f195` is ready; M19 was already applied to this isolated database branch and this deploy had no pending migrations.
- Desktop Commander HTTP smoke tests returned 200 for `/`, `/login`, `/apply`, `/office`, `/office/credit-assessments`, `/demo`, `/privacy` and `/terms`. Protected workspace routes return the login page as expected.
- Build, TypeScript, all 103 automated tests, ESLint and `git diff --check` passed on the committed source.
- Netlify Identity endpoints return 404 on this preview; Identity is dashboard-only and must be enabled/configured at the project Identity settings page before any real account test.
- Application, document-upload, email-delivery and settlement feature gates remain disabled. Required server secrets are not all configured. No live applicant data, uploads, email, WhatsApp, settlements or payouts were enabled.
