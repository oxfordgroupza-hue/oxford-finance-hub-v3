# Cloudflare authentication architecture

## Current design
Oxford Finance Hub authentication runs inside the Cloudflare Worker and stores authoritative user, credential, session, verification-challenge, role and permission records in Neon PostgreSQL.

## Required controls
- Passwords use a modern salted password hash.
- Session tokens are opaque, stored as hashes and issued in secure HTTP-only cookies.
- Login checks account status and email verification.
- Verification and recovery challenges are single-use, expire quickly and are stored as hashes.
- Password recovery revokes existing sessions.
- Email-based account linking is prohibited.
- Role permissions are evaluated server-side, with account-type ceilings and suspension checks.
- The initial Super Administrator bootstrap is one-time, restricted to the configured mailbox and fails closed when account verification or host checks fail.

## Runtime boundaries
Preview requests must originate from an approved Preview Worker hostname and use the isolated preview database. Production requests must use the canonical Finance Hub hostname and production bindings. Authentication email links must remain on the approved HTTPS origin.

## Operational state
The designated administrator mailbox remains unverified. Do not claim that the Super Administrator account is active or send a verification email without explicit authorization. Keep customer intake and document uploads disabled until end-to-end acceptance is complete.
