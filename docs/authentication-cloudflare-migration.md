# Oxford-owned authentication

**Current status — 26 November 2026**

Oxford-owned authentication is the authoritative identity system for the Finance Hub. Cloudflare Workers hosts the application and Neon stores identity, role, session and audit records.

## Implemented controls
- Password credentials are hashed using PBKDF2-HMAC-SHA-256 with unique salts.
- Session and one-time challenge tokens are high-entropy and stored only as hashes.
- Sessions use Secure, HttpOnly cookies with bounded lifetimes and server-side revocation.
- Email verification and password recovery use one-time, short-lived challenges.
- Same-origin and CSRF protections are required for mutations.
- Account status, suspension, role and permission checks are enforced server-side.
- Initial Super Administrator bootstrap is one-time, designated-email and verified-account gated.

## Account recovery policy
The account owner must set and control their own password. Never create, request, display or send a random administrator password. Existing invited accounts must complete the approved verification and recovery process. Do not link accounts solely because email strings match.

## Current Production state
The designated initial administrator account remains unverified and has no active Super Administrator assignment. No active session exists. Production application intake and document uploads remain disabled. Notification delivery is disabled. Email configuration is present but end-to-end delivery has not been accepted.

## Required acceptance
- Registration and duplicate-account handling.
- Email verification, expiry and replay rejection.
- Password recovery, single use and session revocation.
- Login, logout, expiry, rotation and suspension.
- Direct-route and server-function authorization for all roles.
- Partner referral ownership and customer document isolation.
- One-time Super Administrator bootstrap with audit logging.
- Preview/Production separation and fail-closed feature gates.
