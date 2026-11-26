# V3 original source availability and import decision

**Review date:** 26 November 2026  
**Destination:** authorised V3 recovery branch only.

## Findings

A targeted search of the accessible file library for a complete Oxford Finance Hub source export, project archive, ZIP backup, or V3 Cloudflare/Neon source package did not locate a verifiable original application source archive.

The accessible materials include:
- The V3 Master Project Recovery specification (version 2.0).
- Earlier source-export instructions and component/entity inventories.
- Standalone HTML interface prototypes for the V3 DOS-style internal workspace.
- A standalone finance calculation simulator.
- Historical screenshots and design references.

These are requirements, prototypes, or supporting artefacts. They are not the full editable application source tree with backend functions, schema, authentication implementation, dependency lockfile, build configuration and tests.

## Available code baseline

The V2 advanced workflow branch contains a substantial 208-path application tree and the open draft PR #3 reports 72 changed files across 249 commits. Its stack includes React 19, TypeScript, TanStack Start/Router, Vite, Tailwind 4, Drizzle and PostgreSQL. However, its runtime and identity integrations are Netlify-specific: `@netlify/database`, `@netlify/identity`, Netlify Vite integration, Netlify Functions and Netlify migration paths.

The V2 advanced branch also contains useful reusable business logic, UI routes, access-control rules, tests and approved workflow additions. It remains a read-only historical source and cannot be copied unchanged into the current V3 runtime.

## Import decision

Do not bulk-copy the V2 tree into V3 as if it were production-ready Cloudflare source. That would reintroduce the wrong runtime dependencies and could create an unsafe second identity/database model.

The correct V3 recovery sequence is:

1. Obtain or recover the original editable source for the deployed Cloudflare/Neon application, if it exists in an authorised export or development workspace.
2. If unavailable, use V2 advanced as a clearly attributed source baseline for the frontend and reusable domain logic only, preserving its commit provenance.
3. Replace the Netlify-specific server/runtime, authentication, database and migration adapters with verified Cloudflare Worker, Hyperdrive/Neon and private Supabase Storage implementations.
4. Reconcile every schema object with the existing Neon schema before preparing additive migrations. Do not apply production DDL during recovery.
5. Reconcile routes, components, role/permission rules, applicant ownership, partner isolation, documents, audit trails and release flags with the deployed Worker and the V3 master specification.
6. Run secrets/PII scans before any source import because the V3 repository is public.
7. Build and test the resulting V3 source on a dedicated branch. Do not deploy or open production application intake/upload gates until controlled acceptance evidence exists.

## Current blocker

The missing item is not another requirements document or screenshot. It is a verifiable, maintainable source tree for the application currently deployed on Cloudflare. The compiled Worker bundle is not the original TypeScript project and no source maps were present in the inspected deployment upload. Reconstructing a new codebase from that bundle or inventing missing files would not satisfy the V3 recovery requirements.

No source archive was fabricated, no V2/legacy repository was changed, and no production code, database, storage, credentials or feature flags were modified during this review.
