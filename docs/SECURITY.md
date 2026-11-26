# Security model

## Identity and sessions
Oxford-owned authentication runs in the Cloudflare Worker. Passwords are stored as salted hashes. Sessions use opaque tokens stored as hashes, secure HTTP-only cookies, short lifetimes and server-side revocation. Email verification and recovery use short-lived, single-use challenges stored as hashes.

## Authorization
Access is enforced server-side through the role and permission catalogue. Account-type ceilings, least privilege, suspensions, reserved roles and partner/customer record scoping are mandatory. The Super Administrator bootstrap is one-time and fail-closed.

## Data protection
Applicant personal information is encrypted where required. Private documents are stored in the private Supabase bucket and served only after server-side authorization. Never expose document URLs publicly or place personal information in logs.

## Runtime boundaries
The Cloudflare Worker is the only production runtime. Preview and Production use separate bindings and database branches. Origin checks, approved-host checks and explicit feature flags are required for sensitive operations.

## Production controls
Application intake, document uploads and notification delivery remain disabled until security, operational and legal acceptance is complete. Never weaken controls to make a test pass.
