# Oxford Finance Hub V3 — implementation state

Last consolidated review: 26 November 2026.

## Hosting and architecture
The application is deployed on Cloudflare Workers. Neon PostgreSQL is accessed through Cloudflare Hyperdrive. Supabase Storage holds applicant documents in a private bucket. Brevo is configured for transactional email.

## Current production controls
- Application intake is disabled.
- Document uploads are disabled.
- Notification delivery is disabled.
- Authentication email delivery is configured but must be verified before account activation is attempted.
- The designated initial Super Administrator mailbox is not yet verified and has no active Super Administrator assignment.

## Outstanding acceptance work
- Confirm the Cloudflare production build pipeline completes and deploys the exact release commit.
- Verify the production database schema and migration baseline before applying migrations.
- Complete end-to-end authentication and authorization tests.
- Complete private document storage and download authorization tests in Preview.
- Verify transactional email using an approved test recipient.
- Complete legal and regulatory review before enabling customer processing.

This document is a current-state summary. Use the release-readiness and security documents for the release gates.
