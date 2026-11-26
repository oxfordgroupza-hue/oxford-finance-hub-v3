# V2 recovery-to-advanced-branch delta

**Review date:** 26 November 2026  
**Repositories and branches:** V2 `recovery/last-known-good-183ea211` to `feat/oxford-application-workflows`. Read-only comparison.

## Verified Git comparison

- Recovery base: `183ea2117d4be9a587a1632f68e8245091a72897`.
- Advanced branch head: `9c4ad86b27c30a7afe2366539b393ef51018afa5`.
- GitHub compare result: advanced branch is **4 commits ahead and 0 commits behind** the recovery base.
- Those four commits change only three paths.

This distinction matters: PR #3 has 249 commits relative to its V2 main base, but the approved advanced branch is only four commits ahead of the specified recovery commit. The V2 recovery baseline already contains the substantial application and approved workflow work; the four later commits add a focused server-only encryption boundary hardening.

## Exact four-commit sequence

1. `515a0e206d149ee3492cb9077835bcd7f3a2e401` — Isolate applicant encryption to server runtime.
2. `d99a5312dfd9243bb8016b87dde4516ac49f7e75` — Use server-only applicant encryption module.
3. `d80cd517fd7542c27dcb5e167374980def70cbb0` — Use server-only applicant encryption module.
4. `9c4ad86b27c30a7afe2366539b393ef51018afa5` — Remove unguarded applicant encryption module.

## Exact file changes

- `src/lib/application-actions.ts`: imports applicant encrypt/decrypt functions from `pii-crypto.server` rather than the unguarded `pii-crypto` module.
- `src/lib/office-intake-actions.ts`: imports applicant encryption from `pii-crypto.server`.
- `src/lib/pii-crypto.server.ts`: adds the TanStack Start server-only module guard; the module is renamed to make the server boundary explicit.

The comparison shows that the advanced branch preserves the recovery baseline and adds a narrowly scoped security hardening. This change is important to preserve during any V3 port.

## V3 adaptation requirement

The encryption boundary must remain server-only in V3. The exact TanStack-specific marker may not be the correct mechanism inside the deployed Cloudflare Worker architecture; preserve the security property using the V3 server/runtime module boundary and verify that encryption keys and plaintext PII cannot enter browser bundles, logs or client responses.

Do not copy the V2 module mechanically or assume its build guard is effective in the Cloudflare bundle. Verify the actual V3 build output and add a test that fails if server-only encryption code or secrets are included in client assets.

No V2 code was modified and no production runtime, data or feature flags were changed.
