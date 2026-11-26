# Cloudflare Preview test guide

Use the Cloudflare Preview Worker and its isolated Neon branch. Never use production applicant data for tests.

## Build and quality checks
```bash
pnpm cf:build
pnpm typecheck
pnpm test
pnpm lint
```

## Functional tests
- Login and logout with controlled test accounts.
- Email verification and password recovery using an approved test mailbox.
- Role and permission checks for every internal workspace.
- Partner access limited to the partner's own records.
- Customer access limited to the customer's own account and applications.
- Audit history remains append-only.
- Invalid origins, unapproved preview hosts and missing feature flags fail closed.
- Private document upload/download authorization using synthetic test documents only.

## Acceptance record
Record the commit SHA, Preview Worker URL, database branch, test results, failed cases and deployment version. A passing Preview does not authorize production intake, uploads, notifications or database changes.
