# Backup and recovery

## Current status
Neon PostgreSQL is the authoritative relational database. A verified backup schedule, recovery-point objective, restore test and documented production recovery runbook have not yet been accepted.

## Required controls
- Confirm the Neon project's backup and point-in-time recovery settings directly in the provider console.
- Record the retention window and recovery-point objective.
- Create an independent backup before any production schema migration.
- Test restore into an isolated recovery branch, never over the live Production database.
- Verify row counts, schema version, constraints, indexes and application read paths after restore.
- Keep private document storage backups and database metadata recovery coordinated.
- Record the person, time, source snapshot and validation evidence for every recovery exercise.

## Migration safety
All SQL migration files are stored in `db/migrations/`. Review and test each migration against an isolated Neon branch first. Do not apply migrations to Production until the migration baseline, backup and rollback plan are verified and separately approved.

## Release blocker
Do not enable live applications or document uploads until database backup and restore controls have been demonstrated.
