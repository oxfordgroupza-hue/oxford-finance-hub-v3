# Office-created applicant intake and invitation — implementation design

**Status:** design approved for implementation; not yet implemented  
**Working branch:** `feat/oxford-application-workflows`  
**Release restriction:** preview-only until security and end-to-end acceptance tests pass

## Objective

Allow authorised Office staff and Super Admin to start an application for a walk-in applicant or an externally referred applicant, then invite the applicant to create or use their own account and complete the application.

The workflow must preserve separate identities:

- **Applicant/customer:** owns the eventual finance application and controls their password.
- **Creator:** the authenticated Office staff member or Super Admin who opened the intake.
- **Referring partner:** an optional approved merchant partner linked by staff or selected through an approved referral flow.

Never create a customer Identity account on the applicant's behalf, set an applicant password, or attach an application to a staff account.

## Data model

Keep `finance_applications.customer_id` non-null. Do not weaken this ownership constraint to accommodate walk-ins.

Add an application-intake/invitation table separate from `finance_applications`. It should hold:

- UUID primary key and a non-sequential public intake reference.
- Normalised applicant email, applicant type, applicant display name and contact phone.
- Minimal non-sensitive application starter fields, including finance category and selected asset type/catalogue identifiers where known.
- Optional approved partner registration reference.
- Creator user ID, creation timestamp and audit metadata.
- SHA-256 hash of a cryptographically random, high-entropy invitation token; never persist the raw token.
- Invitation expiry, sent timestamp, claimed timestamp, revoked timestamp and claim/customer/application references.
- Explicit state such as `pending_invitation`, `invitation_sent`, `claimed`, `expired`, `revoked`.

Add unique/partial indexes and foreign keys appropriate to the chosen database migration. Prevent more than one active invitation for the same intake. Ensure a claimed or revoked token cannot be reused.

Sensitive identity, income, bank and address information must not be collected in the intake record. Applicant-completed sensitive data must continue through the existing encrypted application flow.

## Office creation and invitation

1. Only an authenticated, provisioned, unblocked Office user with the required application-create permission, or Super Admin, may create an intake.
2. Validate applicant email, applicant type, category and any selected active catalogue references server-side.
3. If a partner is selected, require an approved partner registration with an active linked user and referral code. Do not accept a browser-supplied partner user ID.
4. Record the creator and selected partner separately.
5. Generate a cryptographically random token, store only its hash, and apply a short, explicit expiry (recommended 72 hours).
6. Queue an invitation email to the applicant email address. The email must contain the intake reference, selected asset description, partner business name when applicable, expiry and one-time invitation URL.
7. Do not include applicant identity, bank, income or other sensitive information in the email.
8. Audit intake creation and invitation dispatch. Do not include the raw token in logs, audit details, analytics or error messages.
9. Permit authorised staff to revoke and resend an invitation. Resending must rotate the token and invalidate the previous hash.

## Applicant claim and account verification

Use the existing Netlify Identity customer signup/sign-in experience; do not create a second password system.

- The invitation link opens an application-specific invitation page and places the applicant's token in the URL fragment or query string only as required by the implementation.
- A new applicant creates their own account and password through the existing Identity signup flow.
- The applicant must complete Netlify Identity email confirmation before claiming the intake.
- Because an Identity confirmation email may return the user to the site's default URL, the original invitation link must remain usable after confirmation. The applicant can reopen the original invitation email and follow the same link; the token remains valid until claimed, revoked or expired.
- Existing applicants sign in normally and return to the invitation link.
- The server verifies the authenticated Identity user, confirmed email, normalised email equality with the intake, token hash, expiry, revocation and unclaimed state.
- Claiming must be atomic/transactional. A concurrent second claim must fail.
- Only after successful claim should the server create or find the real customer record, create the finance application with that customer ID, associate the intake and record creator/referrer snapshots.
- Never trust customer IDs, email addresses, roles, partner IDs or ownership claims supplied by the browser.
- Redirect the applicant to the existing application completion experience for the claimed application.

## Application completion and uploads

- Applicant completes all required finance and consent fields using the existing application validation and encryption path.
- Applicant uploads their own supporting documents.
- Authorised Office/Super Admin can upload documents against the claimed application, with server-side permission checks and audit records.
- Office-created applications remain distinguishable from direct applicant submissions through creator metadata.
- Existing document privacy, checksum/idempotency, file-size/type checks and private Supabase Storage controls must be reused.
- Do not store uploaded documents against a pending intake without a valid application/customer owner.
- Do not enable the public `/apply` route or live processing as a side effect of adding the Office intake workflow.

## Partner linking and notifications

- Office can select an approved linked partner during intake creation or link the partner later.
- Enforce one referring partner per application unless a separately audited Super Admin correction workflow is designed.
- Notify the partner that the referral was registered, using the partner's registered business name and asset description.
- This notification is registration-only. It must not grant partner access to the application, applicant profile, identity documents, bank statements or other private documents.
- Partner quotation upload remains available for the partner's own referral.
- Additional supplier supporting-document uploads are permitted only when the Super Admin has enabled the per-partner setting. The setting must default to off and be enforced server-side. Applicant ID, proof-of-address and bank documents remain prohibited for partner uploads.

## Invitation email delivery

The existing notification worker can resolve an email address from a notification payload when no Oxford user ID exists. Extend it with an explicit allowlisted invitation template and strict validation for the recipient, expiry, intake reference, asset description and partner business name.

- Do not accept arbitrary template names or arbitrary recipient destinations from browser input.
- Only server-side Office actions may enqueue an invitation.
- Escape all user-controlled values in HTML and plain-text output.
- Keep the current Deploy Preview hostname/context guard. No production email delivery is enabled by this work.
- Record delivery status and a recipient-domain audit detail; never record the raw invitation URL or token in audit logs.

## Acceptance and security tests

### Authorisation and ownership
- Unauthenticated, unprovisioned, blocked, customer and partner callers cannot create intakes.
- Office staff without application-create permission cannot create intakes.
- A customer cannot claim an intake for another email address.
- An unverified Identity email cannot claim an intake.
- A partner cannot create or claim an Office intake through the Office endpoint.
- Staff creator, customer owner and referring partner remain distinct in the stored records.

### Token lifecycle
- Valid invitation can be claimed once.
- Wrong token, wrong email, expired token, revoked token and already-claimed token are rejected.
- Concurrent claims result in one successful claim only.
- Resending rotates the token and invalidates the old one.
- Raw token is never stored or logged.

### Application and documents
- Claim creates an application only after verified authentication.
- The application customer ID belongs to the authenticated applicant.
- Applicant can complete their own application and upload permitted documents.
- Office/Super Admin can upload permitted documents for the claimed application.
- Partner upload permissions remain scoped to the partner's own referral; additional supplier documents require the Super Admin toggle.
- Partner cannot list or download applicant-private documents.
- No public application intake is enabled by this implementation.

### Notifications and audit
- Invitation email is queued to the exact normalised applicant email.
- Email output is escaped and contains no sensitive applicant data.
- Partner receives referral-registration notice only, without private document access.
- Creation, resend, revoke, claim, partner linking and upload actions are audited without token leakage.

## Implementation sequencing

1. Add the intake schema and additive migration.
2. Implement Office-authorised create/list/revoke/resend actions with audit logging.
3. Extend notification email rendering with the allowlisted invitation template.
4. Implement invitation page and applicant claim endpoint using the existing Identity session.
5. Attach the intake to a real customer and create the finance application atomically.
6. Route the applicant to complete the existing application flow.
7. Add Office intake UI and claimed-application upload controls.
8. Add unit/integration/security tests and validate the Deploy Preview.
9. Keep production processing, production email, production migrations and PR merge disabled until separately approved.
