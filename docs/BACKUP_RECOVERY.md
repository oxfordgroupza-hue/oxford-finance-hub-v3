## Current-state addendum — 25 November 2026

Read [RELEASE_READINESS.md](RELEASE_READINESS.md) for the full release assessment. A fresh read-only check found no Neon snapshot schedule for either the isolated Preview branch or the project default branch, no listed Neon snapshots, and no migration-history table in the Preview database. The existing no-compute checkpoint branch is not an independent backup. Do not claim database backup or restore readiness until provider retention, an independent backup, and a restore drill are verified. Production remains untouched.

---

# Backup and recovery — Oxford Finance Hub V3

**Status: NOT YET ACCEPTED.** This document records the current recovery boundary and the work required; it does not claim a tested backup.

## Current architecture

- Cloudflare Workers: application runtime.
- Neon PostgreSQL: authoritative V3 relational database.
- Supabase Storage: private document objects.
- Cloudflare Worker secrets/bindings: environment-specific configuration.
- Netlify: retained rollback/reference environment during migration.

## Preview isolation and checkpoint

The Preview database is Neon project `odd-field-47093538`, branch `br-autumn-rain-bgtzmfh8`, database `oxford_finance_hub`. It is a ready, non-primary branch isolated from the default branch.

A no-compute checkpoint branch exists: `br-hidden-pine-bge4ifgv`, named `v3-preview-pre-acceptance-checkpoint-20261125`. It is a Preview rollback checkpoint only, not a verified production backup.

No explicit Neon snapshot schedule was returned for the Preview branch or project default branch. No restore test has been completed.

## Required recovery design

Before production data is accepted, document and test:
1. Neon backup/PITR retention and recovery-point objectives for the selected plan.
2. Scheduled database exports or provider-supported snapshots, stored separately from the source database.
3. Supabase object inventory, metadata/object reconciliation and recovery procedure.
4. Encrypted backup handling and access control.
5. Recovery of Worker configuration and secret names/rotation process without recording secret values.
6. Restore into an isolated recovery branch/project.
7. Application smoke tests after restore: login, roles, applications, documents, audit history and notification queue.
8. Rollback decision, responsible operator, evidence and communication procedure.

## Safety rules

- Do not modify the production database, create paid backup resources, change billing or alter retention settings without explicit approval.
- Do not treat a branch clone/checkpoint as an independent backup.
- Do not use production applicant data for recovery drills.
- Do not delete source data or migration history as a troubleshooting shortcut.
- Keep uploads and live processing disabled until recovery has been verified.
