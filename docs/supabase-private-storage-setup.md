# Supabase private document storage — V3 implementation

Last reviewed: 11 November 2026

## Provider decision

Supabase is used **only for private document file storage** in Oxford Finance Hub V3.

- Relational database: Netlify Database (PostgreSQL) via Drizzle.
- Authentication: Netlify Identity.
- File storage: Supabase Storage.
- Server-side authorization and orchestration: Netlify Functions.

Do not move V2 application tables, roles, permissions, referrals, audit records or application statuses to Supabase. Do not use Supabase Auth or create a Supabase database connection for this project.

## Existing bucket

The connected Supabase project and existing bucket were inspected read-only on 9 November 2026. The existing bucket is:

- Name: `oxford-customer-documents`
- Public: false
- Maximum file size: 10 MiB
- Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`
- Existing policy denies direct client access for `anon` and `authenticated`.

Preserve this bucket and its privacy restrictions. Do not create another bucket, make this bucket public, widen client policies or change its limits without explicit review.

### V3 preview verification — 11 November 2026

The V3 Deploy Preview health endpoint currently reports `bucketConfigured=true` but `storageVerified=false`, `encryptionConfigured=false`, `documentUploadsEnabled=false` and `liveApplicationsEnabled=false`. The bucket's existence and prior private configuration are known from the 9 November read-only inspection; current server-side storage verification is blocked because the V3 Supabase server secret and PII encryption key are not configured. Do not describe storage as operational or enable uploads until the synthetic-data acceptance matrix passes.

## Current code path

`netlify/functions/oxford-api.ts` implements server-mediated storage operations:

1. Validates the Netlify Identity bearer token against the Identity endpoint resolved from the exact V3 Netlify deployment URL (`URL` / `DEPLOY_PRIME_URL`); no V2 site URL or site ID is hard-coded.
2. Resolves the Identity subject to the Oxford account in Netlify Database.
3. Derives effective roles and permissions from the Netlify Database access-control tables.
4. Checks application ownership or office assignment/permissions before document operations.
5. Enforces a **4 MiB application upload limit**, allowed MIME types, file signatures and a database-enforced per-application maximum of 20 documents.
6. Uses the Supabase Storage HTTP API from the Netlify Function with a server-only credential.
7. Stores object paths, metadata, checksums and operation status in Netlify Database; file bytes are not stored in the relational database.
8. Creates short-lived signed download URLs only after the permission check.
9. Writes audit events for successful document upload and access.

The browser must never receive the Supabase secret/service credential. The browser must not access the bucket directly. Do not store permanent public URLs or signed URLs in the database.

## Required server-only configuration

Configure these variables in the V3 Netlify Deploy Preview context for synthetic acceptance tests only. Keep production credentials and feature gates separate:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (server-only; send it in the `apikey` header only, never as `Authorization: Bearer` and never as a `VITE_*` variable). Supabase's current opaque `sb_secret_...` keys are not JWTs.
- `SUPABASE_BUCKET=oxford-customer-documents`
- `OXFORD_DOCUMENT_UPLOADS_ENABLED=false` until acceptance testing passes.

The Supabase storage credential must be available only to trusted server functions. Never paste it into chat, source code, GitHub, build output or client-side environment variables. The function must continue to fail closed if required configuration is missing or the bucket no longer matches the expected private settings.

## Required tests before enabling uploads

Use synthetic accounts and dummy documents only:

1. Anonymous and unauthenticated access cannot list, upload or download objects.
2. Invalid, expired and forged Netlify Identity sessions are rejected.
3. A customer cannot read or download another customer's documents, including by changing application/document IDs.
4. A partner cannot access customer documents merely because a referral exists; only explicitly granted permissions and the relevant relationship permit access.
5. Customer Support has no document access unless separately authorized.
6. Office reviewers can access only documents allowed by their permissions and assignment.
7. Super Administrator access is controlled and audited.
8. Unsupported MIME types, mismatched file signatures, empty files, files over 4 MiB and invalid document keys are rejected.
9. Duplicate uploads are idempotent; interrupted uploads can be safely retried.
10. A storage success followed by metadata failure is cleaned up or flagged for reconciliation; failed cleanup must not be silently treated as success.
11. Signed download links expire and are not persisted.
12. Upload and download operations create appropriate audit records.
13. Missing storage credentials, a public bucket, changed MIME/size limits or an unavailable Storage API fail closed.
14. No real application or document upload can be submitted while the feature flags are disabled.
15. Concurrent uploads cannot exceed the 20-document application cap.

## Operational controls

- Monitor Supabase Storage usage and egress against the account's actual plan quotas.
- Define document retention, deletion authorization and secure export/recovery before accumulating real applicant documents.
- Keep object paths opaque; never include applicant names, email addresses, South African ID numbers, registration numbers or other personal details.
- Keep the Netlify Database record and Storage object lifecycle reconciled. A database row without an object or an object without metadata must be detectable and handled.
- Restrict and audit office document downloads.
- Do not use real customer data for development or acceptance tests.

## Release gate

Keep `OXFORD_DOCUMENT_UPLOADS_ENABLED` false until the tests above pass on the V3 non-production environment using synthetic data. Keep `OXFORD_APPLICATIONS_ENABLED` false until the entire application submission, encryption, notifications, PDF, audit and recovery workflow has also passed.

The V3 Deploy Preview remains gated. This document does not authorize a production deploy, feature-flag change or public acceptance of applications.

## Upload size constraint

The Supabase bucket permits objects up to 10 MiB, but the current upload route sends multipart file data through a Netlify Function. Netlify's buffered function request limit is 6 MB, and binary uploads incur approximately 30% Base64 overhead, giving an effective binary limit of about 4.5 MB. To avoid intermittent failures at the platform boundary, V3 enforces a **4 MiB application upload limit** in both the browser and server. The bucket remains at 10 MiB; do not change its settings. Supporting files larger than 4 MiB requires a separate server-authorized signed-upload flow directly to Supabase Storage, followed by server-side object verification and metadata finalization. That larger-file flow is not yet implemented.

Netlify limit reference: https://docs.netlify.com/build/functions/configuration/
