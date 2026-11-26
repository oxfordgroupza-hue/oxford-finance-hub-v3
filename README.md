# Oxford Finance Hub V3

**Status: Source recovery in progress. The repository is not yet the complete application source and is not a production release.**

Oxford Finance Hub is the finance-intermediary platform of Oxford Business Group (Pty) Ltd, operating in South Africa.

## V3 authority

This repository is the authorised V3 development target. The V2 and legacy repositories are read-only recovery references. Do not modify them as part of V3 work.

## Current production runtime (verified configuration)

- **Application runtime:** Cloudflare Worker `oxford-finance-hub-v3-production`.
- **Relational database:** Neon PostgreSQL, accessed by the Worker through Cloudflare Hyperdrive.
- **Private document storage:** Supabase Storage, using the private `oxford-customer-documents` bucket through server-side configuration only.
- **Application identity and sessions:** handled by the Finance Hub application runtime; the maintainable source implementation and complete end-to-end account lifecycle still require recovery and verification.
- **External notifications and CRM:** Brevo, WhatsApp and HubSpot work is deferred to the final integration stage.

This section describes the inspected production configuration, not proof that every application workflow is ready for live use. The deployed Worker currently exists as a compiled bundle; it is not a substitute for maintainable, testable source code.

## Release safety

This repository does not authorise a production deployment or live processing. Application submissions and document uploads remain disabled. Do not enable them until the recovered V3 source has passed build, type, unit, integration, security, role-isolation, document-access and controlled end-to-end acceptance checks.

Do not commit credentials, applicant data, private documents, private keys, invitation tokens or confidential commercial terms. Keep all secrets in approved server-side secret bindings. Never place sensitive values in source, documentation, client bundles or logs.

## Recovery provenance

The V3 source baseline is being reconciled against the V2 recovery commit `183ea2117d4be9a587a1632f68e8245091a72897` and the approved V2 advanced workflow branch. Those repositories remain read-only. The V2 implementation is based on a different hosting and identity stack, so its UI, domain logic, tests and migrations must be adapted and verified against the current Cloudflare Worker, Hyperdrive/Neon and private Supabase Storage runtime before they can become V3 source.

See:
- `docs/recovery/cloudflare-neon-source-audit-2026-11-26.md`
- `docs/recovery/v2-advanced-workflow-review-2026-11-26.md`

## Development rule

Do not invent missing source files from compiled output or screenshots. Recover verifiable original source, reconcile its data model and security rules with the live runtime, then build and test the V3 application from this repository. Keep production safeguards closed throughout recovery.
