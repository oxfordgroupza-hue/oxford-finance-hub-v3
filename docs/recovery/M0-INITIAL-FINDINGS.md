# M0 recovery baseline — current reference

This document records the initial recovery principles that remain relevant to the V3 repository. The current implementation and release status are maintained in [RELEASE_READINESS.md](../RELEASE_READINESS.md).

## Recovery principles
- Preserve the existing application workflows, schema and migration contents.
- Use Cloudflare Workers for the runtime, Oxford-owned authentication and Neon PostgreSQL as the relational source of truth.
- Keep document storage private and server-mediated.
- Maintain separate Preview and Production environments.
- Do not modify Production records or apply schema migrations during a code-only recovery.
- Keep application intake, document uploads, notifications, settlements and payouts disabled until their independent acceptance gates pass.
- Require verified account ownership for administrator activation and recovery.
- Use synthetic data for Preview testing.
