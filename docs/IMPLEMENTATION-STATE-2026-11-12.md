# V3 implementation and acceptance state — 12 November 2026

**Authority:** Oxford Finance Hub V3 Master Project Recovery Specification v2.0, consolidated 10 November 2026. This register is an evidence snapshot, not a release approval.

## Active development target

- Repository: `https://github.com/oxfordgroupza-hue/oxford-finance-hub-v3`
- Branch: `fix/v3-desktop-validation-baseline`
- Commit: `2158ea5d74b9c209e88c01710ff8ecd87a53af3d`
- Deploy Preview: `https://deploy-preview-2--oxford-finance-hub-v3-c28z.netlify.app/`
- Pull request: `https://github.com/oxfordgroupza-hue/oxford-finance-hub-v3/pull/2` (open, draft, unmerged)
- Netlify deploy: `6af53cb2bcb551631c46d144` (`ready`, Deploy Preview only)

## Evidence captured 12 November 2026

| Check | Result |
| --- | --- |
| Vitest | 35 files, 188 tests passed |
| TypeScript | Passed |
| ESLint | Passed |
| Drizzle migration check | Passed |
| Vite client build | Passed |
| Vite SSR build | Passed |
| `git diff --check` | Passed |
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
