## Current-state addendum — 26 November 2026

The production Worker is active on `finance.oxfordbusinessgroup.co.za` and uses Neon branch `production-2026-11-25`, whose parent is the isolated `cloudflare-preview` branch. Two point-in-time production checkpoint branches exist: `production-prelaunch-checkpoint-20261125` and `production-safety-checkpoint-2026-11-26`. They are Neon branches within the same project, not independent backups.

Live Neon control-plane inspection on 26 November 2026 confirms the project PITR/history-retention window is only **21,600 seconds (6 hours)**. There is one manual snapshot, created on 25 November 2026 at 08:49:42 UTC, and it belongs to default branch `main`, not the production branch. No automatic snapshot schedule was found. Six branches are present; all six currently report `protected=false`, including `production-2026-11-25`. The two production checkpoint branches are same-project branches, not independent backups. No restore drill has been completed. The production application and document-upload flags remain false. Do not claim backup/restore readiness or change production resources without separate approval.
---

# Backup and recovery — Oxford Finance Hub V3

**Status: NOT YET ACCEPTED.** This document records the current recovery boundary and the work required; it does not claim a tested backup.

## Current architecture

- Cloudflare Workers: application runtime.
- Neon PostgreSQL: authoritative V3 relational database.
- Supabase Storage: private document objects.
- Cloudflare Worker secrets/bindings: environment-specific configuration.

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
