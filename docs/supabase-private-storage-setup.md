# Supabase private document storage — V3

**Provider decision:** Supabase Storage is used only for private application files. Neon remains the authoritative relational database. Cloudflare Workers perform server-side authorization and storage operations.

## Existing bucket

- Project URL: `https://wgcnawtnkblivfirclvz.supabase.co`
- Bucket: `oxford-customer-documents`
- Public: false.
- Bucket limit: 10 MiB.
- Allowed MIME types: PDF, JPEG and PNG.
- Direct `anon` and `authenticated` client access is denied by the storage-object policy.

Read-only inspection on 25 November confirmed the bucket is private, has the expected limits and has zero stored objects.

## V3 Worker configuration and health

The branch-specific Preview deployment contains encrypted `SUPABASE_SECRET_KEY` and `OXFORD_PII_ENCRYPTION_KEY` bindings, plus the expected Supabase URL and bucket name. The live health endpoint returned HTTP 200 with `storageVerified=true` and `encryptionConfigured=true`.

This proves provider configuration and bucket verification, not upload/download authorization. No file has been uploaded.

## Application limits and rules

- Server-mediated upload cap: 4 MiB, stricter than the provider's 10 MiB bucket limit.
- Maximum 20 documents per application.
- PDF, JPEG and PNG only.
- Validate MIME and actual file signature.
- Use opaque object paths; never include names, email addresses, ID numbers or other PII.
- Store metadata/checksum/operation state in Neon, not file bytes.
- Authorize each upload/list/download using current account, ownership, role, assignment and partner scope.
- Issue short-lived signed downloads only after authorization.
- Reconcile failed/interrupted uploads and orphaned objects.
- Audit successful upload and access events.
- Keep direct client storage access denied.

Do not increase the 4 MiB route limit or the bucket limit without a reviewed implementation and explicit approval.

## Feature gate and outstanding tests

`OXFORD_DOCUMENT_UPLOADS_ENABLED=false` remains in Preview. Before enabling it, test dummy files for:
- anonymous denial;
- customer cross-account denial;
- partner and support document denial;
- Office assignment and permission scope;
- MIME/signature/size/key validation;
- 20-document concurrency cap;
- duplicate/idempotent upload;
- signed URL expiry;
- interrupted upload, retry and cleanup;
- storage-success/metadata-failure reconciliation;
- download audit events.

Use synthetic accounts and dummy files only. No real applicant documents may be uploaded to Preview.
