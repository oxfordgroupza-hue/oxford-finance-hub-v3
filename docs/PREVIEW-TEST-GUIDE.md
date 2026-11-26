# Cloudflare Preview test guide

**Environment:** isolated Cloudflare Preview Worker and isolated Neon Preview branch.

## Rules
- Use synthetic test accounts, names and dummy values only.
- Never enter real identity, banking, personal or financial information.
- Do not upload real documents.
- Do not send messages to real customers, partners or staff.
- Do not modify Production Worker settings, secrets, DNS or database records.

## Test sequence
1. Confirm the Preview hostname and environment context in Cloudflare.
2. Confirm the Preview database binding points to the isolated Neon branch.
3. Confirm the health endpoint reports the expected Preview context.
4. Test public routes and responsive navigation.
5. Test synthetic account registration, verification, login, logout and recovery.
6. Test role-based direct-route and server-function access with synthetic users.
7. Test partner ownership boundaries and audit history.
8. Confirm document uploads, external notifications and all financial execution remain disabled unless a specific isolated test gate has been approved.

## Acceptance evidence
Record the commit, build ID, Preview Worker version, test results and any failed workflow. Do not infer Production readiness from a passing Preview build.
