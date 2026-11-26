# Implementation state — superseded snapshot

This historical implementation snapshot is superseded by [RELEASE_READINESS.md](RELEASE_READINESS.md), which records the current Cloudflare Production deployment and remaining acceptance work.

Current architecture: Cloudflare Workers, Oxford-owned authentication, Neon PostgreSQL through Hyperdrive, private Supabase Storage and Brevo transactional email.

Current Production controls: application intake disabled, document uploads disabled and notification delivery disabled. The designated Super Administrator account remains unverified and has no active role assignment. Do not use this historical snapshot as operational deployment guidance.
