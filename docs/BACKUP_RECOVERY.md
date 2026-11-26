# Backup and recovery

## Recovery sources
- Neon PostgreSQL: use the provider's branch and restore facilities; preserve a verified production backup before any schema or data change.
- Supabase Storage: retain the bucket as private and establish a documented backup/restore procedure for stored objects and metadata.
- Cloudflare Workers: retain known-good deployed versions and verify the version/traffic allocation before rollback.
- GitHub: release branches and reviewed commits are the source of application code and migration history.

## Recovery sequence
1. Declare the incident and stop the affected workflow using its feature flag.
2. Identify the last known-good Worker version and the corresponding Git commit.
3. Confirm the production database state and restore point before changing schema or data.
4. Restore or roll back the Worker without changing secrets or database state unless the recovery plan explicitly requires it.
5. Verify authentication, permissions, health endpoints and private document access.
6. Re-enable a feature only after the incident has been reviewed and the relevant acceptance checks pass.

Never restore a database snapshot over current production data without an approved recovery decision. Never make private document buckets public as a recovery shortcut.
