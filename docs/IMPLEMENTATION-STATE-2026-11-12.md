# V3 implementation and acceptance state — 12 November 2026

**Authority:** Oxford Finance Hub V3 Master Project Recovery Specification v2.0, consolidated 10 November 2026. This register is an evidence snapshot, not a release approval.

## Active development target

- Repository: `https://github.com/oxfordgroupza-hue/oxford-finance-hub-v3`
- Branch: `fix/v3-desktop-validation-baseline`
- Commit: `64a7d529f6c54ca2da0500187f025b59f6886600` (latest tested source; header regression test now adds one test)
- Deploy Preview: `https://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app/`
- Pull request: `https://github.com/oxfordgroupza-hue/oxford-finance-hub-v3/pull/2` (open, draft, unmerged)
- Netlify deploy: `6af55c5ce391f5bf04370f18` (`ready`, Deploy Preview only)

## Evidence captured 12 November 2026 (updated after sign-out correction)

| Check | Result |
| --- | --- |
| Vitest | 36 files, 195 tests passed |
| TypeScript | Passed |
| ESLint | Passed |
| Drizzle migration check | Passed |
| Vite client build | Passed |
| Vite SSR build | Passed |
| `git diff --check` | Passed
| Sign-out correction | Server action clears `nf_jwt` and `nf_refresh`; both public and workspace controls invoke it before Identity logout | Authenticated browser sign-out still awaits synthetic-account acceptance | |
| Netlify secret scan | 228 files scanned; no matches |
| Preview health | Netlify authoritative database; private bucket configured and verified; PII encryption configured |
| Release flags | Live applications disabled; document uploads disabled |
| Identity service | Email authentication enabled with confirmation required; settings HTTP 200; unauthenticated user endpoint HTTP 401 |
| Route smoke test | 20 public and protected route paths returned HTTP 200, including `/`, `/login`, `/apply`, `/office`, `/office/intakes`, `/partner`, `/office/credit-assessments`, `/partner-payouts`, policy and support pages |
| Preview migrations | M26 applied; M24/M25 applied in preceding deployments |

## Implementation-state distinctions

### Implemented in source and automated tests passing

- Seven-role permission model, account-type caps, Super Admin permission derivation and access-control tests.
- Customer/partner self-service scope and restricted people directory with masked identity values, permission-gated full identity lookup, HMAC fingerprint search, rate limiting and audit events.
- Office applicant intake create/list/revoke/resend/claim workflow; invitation tokens are high-entropy, hashed at rest, expire after 72 hours and are bound to a verified matching applicant email. Token hashing and claim-state validation now have dedicated unit tests, including explicit rejection of an `expired` state.
- Partner-originated starter intake; active partner and asset-catalogue validation; referral ownership is assigned to the customer after claim; partner notification is registration-only.
- Partner referral/linking rules and server-side supplier upload permission checks.
- Individual/Business credit-assessment evidence model, verified-only calculations, append-only reviewer evidence and versioned 100-point rules workflow.
- Versioned partner-specific commercial terms, immutable settlement snapshots and append-only adjustment logic.
- Server-mediated private document-storage implementation and health verification.
- Notification queue/template/retry implementation.

### Deploy Preview verified

- Current Deploy Preview is ready and the listed public/auth-gated routes return HTTP 200.
- Preview health confirms private storage verification and encryption configuration while applications and uploads remain disabled.
- Office Super Administrator directory access and lookup paths were exercised in the preview browser; the identity backfill returned zero existing applications.
- Preview migration M26 was applied; secret scanning passed.

### Awaiting synthetic authenticated acceptance

- Customer and Partner account creation, confirmation, login, recovery and sign-out journeys.
- Office invitation create → delivery → verified applicant claim → resume/complete lifecycle, including wrong-email, expiry, revocation, resend token rotation and concurrent claim tests.
- Partner-originated intake → invitation → claim → customer-owned application → referral registration, including one-partner conflict and isolation checks.
- All eight Individual/Business × four finance-category application combinations.
- Reviewer assignment boundaries and all seven role direct-route/direct-function restrictions.
- Synthetic document upload/download, cross-customer and cross-partner denial, concurrency, idempotency and interrupted-operation recovery.
- Controlled notification delivery to an Oxford-owned preview inbox and provider failure/retry checks.
- Synthetic credit assessment and settlement reconciliation, with no live payment execution.

The current preview database has no customer/partner application or referral records available for those live paths. Do not create or contact real applicants as test data. Use isolated synthetic accounts and dummy documents only.

### Latest sign-out correction (commit `e591bd1`)

The application maintains its own `nf_jwt` and `nf_refresh` cookies in addition to the browser Netlify Identity session. A same-origin server action expires both cookies; both sign-out controls invoke it before browser Identity logout. Both session cookies are now HttpOnly. Invitation claims, partner registrations and enquiry account-linking now use the same authoritative TanStack server session; the public header also reads that server session rather than depending on a separate browser SDK token. The new verified-session helper has six regression tests. Full local validation at commit `64a7d52` plus authenticated-header regression test: 36 test files, 195 tests passed; TypeScript, full ESLint, Drizzle check, client/SSR build and diff check passed. Deploy Preview `6af55c5ce391f5bf04370f18` is ready with three functions, no pending migrations and a clean secret scan (230 files scanned, no matches). Post-deploy smoke: 12 public routes returned HTTP 200; `/apply` pause notice and `/demo` noindex marker present; eight protected routes redirected to `/login`; health returned HTTP 200 with uploads/applications disabled; unauthenticated private application API returned HTTP 401. Existing authenticated Super Administrator browser session still resolves the reserved role and 76 effective permissions. Previous ready preview `6af5596762c42a8ec0c23492` included all three functions, no pending migrations and a clean secret scan across 228 files. Post-deploy smoke checks on the preceding code preview returned HTTP 200 for public routes, 307 to `/login` for eight protected routes, HTTP 200 for health with live applications/uploads disabled, and HTTP 401 for the unauthenticated private application API. Authenticated sign-out and customer/partner workflows still await synthetic-account acceptance.

### Awaiting business / professional approval

- Commercial terms and fee formula activation; the historical commercial statements must not be conflated or silently activated.
- Legal/compliance review of privacy wording, FICA requirements, retention, complaints and Oxford's actual regulated activities.
- Production deployment, production migrations, live application intake, document upload, live email/WhatsApp and any settlement/payout operation.

## Release gates — remain closed

- `OXFORD_APPLICATIONS_ENABLED=false`
- `OXFORD_DOCUMENT_UPLOADS_ENABLED=false`
- `OXFORD_SETTLEMENT_TERMS_APPROVED=false`

No production deployment, production migration, live applicant processing, live document upload, live notification delivery, transfer or payout has been authorised by this checkpoint.

## Known acceptance limitations

- A ready Deploy Preview and successful unit/build checks do not prove complete authenticated end-to-end behaviour.
- The Deploy Preview is publicly addressable and may contain copied preview data; do not circulate it externally without reviewing its contents and access controls.
- Email provider configuration is not equivalent to a verified delivery test. No controlled recipient delivery is claimed here.
- Private storage health verification is not equivalent to successful upload/download acceptance. Uploads remain disabled.
- The user-visible product remains in Deploy Preview; the production site has not been published.


### Production launch gate - 12 November 2026

- Production Netlify hostname https://oxford-finance-hub-v3-c28z.netlify.app currently returns HTTP 404; no production deploy exists for this V3 site.
- netlify.toml intentionally skips production-context deploys and permits isolated Deploy Previews only. This guard remains in place.
- The privacy policy, POPIA notice, terms and complaints process are visibly marked as drafts. The Information Officer contact is not yet confirmed, and the external complaint escalation details are explicitly pending. These cannot be replaced with invented legal details.
- Online application submissions and document uploads remain disabled. No real applicant intake, personal/financial document collection, live provider delivery or settlement execution is available.
- The ready Deploy Preview is suitable for controlled review/demo only; it is not a production launch.
