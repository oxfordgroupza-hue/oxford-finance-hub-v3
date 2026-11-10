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
- `OXFORD_INITIAL_SUPER_ADMIN_BOOTSTRAP_ENABLED`

## Feature gates
- `OXFORD_APPLICATIONS_ENABLED=false`
- `OXFORD_DOCUMENT_UPLOADS_ENABLED=false`
- `OXFORD_EMAIL_DELIVERY_ENABLED=false`
- `OXFORD_SETTLEMENT_TERMS_APPROVED=false`

Use separate credentials and contexts for local development, Deploy Preview and production. Never prefix secrets with `VITE_`. Verify provider-specific secret formats from current provider documentation. Do not enable live integrations without separate approval and acceptance evidence.
