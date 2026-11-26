# Office-assisted applicant invitation design

## Identity and ownership

Use the Oxford-owned authentication system for applicant registration, sign-in, email verification and recovery. Do not create a second password system or allow staff to set an applicant's password.

## Invitation flow

1. An authorized office user creates an invitation with a defined account type and limited scope.
2. The system stores a hashed, one-time invitation challenge with an expiry.
3. The applicant opens the invitation and verifies control of their email address.
4. The applicant chooses and controls their own password through the normal account setup flow.
5. The server links the verified account to the intended intake only after the challenge and ownership checks pass.
6. Every privileged action is written to the append-only audit log.

## Security boundaries

- Never disclose or generate an applicant password.
- Do not link an existing account based on email equality alone.
- Invitation tokens must be one-time, short-lived and stored only as hashes.
- Staff cannot access unrelated customer records or private documents.
- Partner users can access only their own referrals and explicitly authorized customer scope.
- Real applicant onboarding remains unavailable until the Production acceptance gates are complete.
