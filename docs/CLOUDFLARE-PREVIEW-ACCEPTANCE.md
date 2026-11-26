# Cloudflare Preview acceptance

## Purpose
Use the isolated Cloudflare Preview Worker and its separate Neon branch for controlled synthetic testing. Preview is not a live customer service.

## Required checks
1. Confirm the Preview Worker and its Neon branch are isolated from Production.
2. Confirm the build runs the Cloudflare Vite build, Wrangler type generation, TypeScript, tests and lint.
3. Confirm health checks identify Neon as the authoritative database.
4. Confirm the document bucket is private and uploads remain disabled until their security tests pass.
5. Use synthetic names, addresses and test values only. Never submit real identity, banking or financial information.
6. Test registration, verification, login, logout and recovery only with an approved synthetic account and approved mailbox.
7. Test direct-route and direct-server-function authorization for each role.
8. Test partner ownership boundaries and customer document isolation.
9. Confirm applications, document uploads, notifications, settlements and payouts remain disabled outside the approved isolated Preview tests.
10. Record failures and evidence before proposing any Production change.

## Production boundary
Preview tests must not change Production Worker settings, secrets, database records, DNS or custom-domain configuration. No live customer communications are authorized by a Preview build.
