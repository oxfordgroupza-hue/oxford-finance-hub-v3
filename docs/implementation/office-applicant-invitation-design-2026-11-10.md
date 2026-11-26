# Office and applicant account invitation design

## Account creation
Office accounts are created through an administrator-controlled invitation workflow. Customer accounts are created only through the approved application registration flow. Users create their own password and must complete email verification before account activation.

## Password and verification
Passwords are stored as salted hashes. Verification and recovery links use single-use, short-lived random tokens stored only as hashes. Existing credentials must not be overwritten during a verification resend. Password recovery revokes active sessions.

## Role assignment
New accounts receive no privileged role by default. Office role assignment requires an authorized administrator and an audit record. The initial Super Administrator bootstrap is one-time and restricted to the configured mailbox.

## Production controls
Do not enable public customer registration or application intake until the relevant feature flags, email delivery, legal review and security tests have been accepted. Never use email address matching to attach a new login to an existing account.
