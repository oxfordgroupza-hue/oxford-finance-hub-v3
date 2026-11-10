# Oxford Finance Hub V3

**Status: Recovery and baseline import in progress. This repository is not a production release.**

Oxford Finance Hub is the finance-intermediary platform of Oxford Business Group (Pty) Ltd, operating in South Africa.

## V3 authority

This repository is the authorised V3 development target. The V2 and legacy repositories remain read-only recovery references and must not be modified as part of V3 work.

## Target architecture

- Hosting, Deploy Previews, Identity, PostgreSQL database and server functions: Netlify.
- Private application-file storage: Supabase Storage only.
- Transactional email: Brevo, disabled until controlled acceptance tests pass.
- Application authentication and relational ownership remain with Netlify Identity and Netlify Database.
- Supabase Auth and Supabase relational tables are not part of the approved V3 architecture.

## Release safety

This repository does not authorise production deployment or live processing. Real applications, document uploads, transactional notifications, settlement processing and payouts remain disabled until their acceptance tests and separate approvals are complete.

Never commit credentials, applicant data, private documents, private keys, invitation tokens or confidential commercial terms. Commercial terms must be supplied through restricted server-side configuration and must not be embedded in this public repository.

## Recovery provenance

The V3 baseline is being recovered from the verified V2 recovery commit `183ea2117d4be9a587a1632f68e8245091a72897`, reconciled with the approved advanced workflow branch and its latest security changes. Source SHAs and import decisions will be recorded in the recovery documentation.

