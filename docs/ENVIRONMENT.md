# Environment configuration

This document lists variable names only. Never commit values.

## Required infrastructure

- Netlify-provided database connection for Drizzle/Netlify Database.
- Netlify Identity site configuration.
- V3 Netlify site ID after the project is created.

## Server-only integrations

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_BUCKET`
- `OXFORD_PII_ENCRYPTION_KEY`
- `BREVO_API_KEY`
- `OXFORD_NOTIFICATION_FROM_EMAIL`
- `OXFORD_NOTIFICATION_FROM_NAME`
- `OXFORD_NOTIFICATION_ADMIN_EMAIL`
- `OXFORD_INITIAL_SUPER_ADMIN_EMAIL`
- `OXFORD_INITIAL_SUPER_ADMIN_PREVIEW_BOOTSTRAP_ENABLED` (Deploy Preview context only; must be `true` only for the controlled initial administrator test)

## Feature gates

- `OXFORD_APPLICATIONS_ENABLED=false`
- `OXFORD_DOCUMENT_UPLOADS_ENABLED=false`
- `OXFORD_EMAIL_DELIVERY_ENABLED=false`
- `OXFORD_SETTLEMENT_TERMS_APPROVED=false`

Use separate credentials and contexts for local development, Deploy Preview and production. Never prefix secrets with `VITE_`. Verify provider-specific secret formats from current provider documentation. Do not enable live integrations without separate approval and acceptance evidence.

## V3 Deploy Preview configuration status — 11 November 2026

The latest preview health endpoint reports:

- Netlify Database is the authoritative relational database.
- The Supabase bucket is configured, but server-side storage verification is false.
- PII encryption is not configured.
- Document uploads and live application submission are disabled.
- Netlify Identity settings return HTTP 404 because Identity has not been enabled for the V3 site.
- A Netlify environment-variable write returned HTTP 403; the preview bootstrap flag and server-only credentials therefore remain externally blocked.

No secret values belong in this document or in chat. An authorised Netlify dashboard operator must configure the preview-only variables. Keep all production variables and feature gates separate and disabled until the synthetic acceptance matrix and qualified review are complete.
