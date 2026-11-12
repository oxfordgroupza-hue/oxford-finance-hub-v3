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

## V3 Deploy Preview configuration status — 12 November 2026

The latest verified Deploy Preview health endpoint reports:

- Netlify Database is the authoritative relational database.
- The private Supabase bucket is configured and server-side storage verification is true.
- PII encryption is configured.
- Document uploads and live application submission remain disabled.
- Netlify Identity settings return HTTP 200; email authentication is enabled and email confirmation is required.
- The unauthenticated Identity user endpoint returns HTTP 401, as expected.
- Super Administrator Office directory access has been exercised in the preview browser.

These checks verify configuration and limited authenticated access, not complete applicant, partner, document, email or finance workflows. Do not infer successful email delivery or document upload from configuration/health checks. Keep production variables and feature gates separate and disabled until synthetic acceptance and qualified review are complete.

No secret values belong in this document or in chat.
