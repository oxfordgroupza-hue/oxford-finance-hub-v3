# V3 Neon schema compatibility and preview-build diagnosis

**Review date:** 26 November 2026  
**V2 source reference:** `oxford-finance-hub-v2`, branch `feat/oxford-application-workflows`, head `9c4ad86b27c30a7afe2366539b393ef51018afa5`  
**V3 destination:** `oxford-finance-hub-v3`, branch `recovery/cloudflare-neon-source-audit`  
**Database inspected:** Neon project `odd-field-47093538`, branch `br-ancient-cloud-bgs9qmsf`, database `oxford_finance_hub`  
**Scope:** Read-only schema inspection and preview build log inspection. No SQL writes, migrations, feature-flag changes, or production deployments.

## Executive result

The V2 advanced Drizzle schema declares 36 tables. All 36 table names are present in the current Neon database. A column-level comparison of the explicit column declarations found no V2-declared columns missing from the corresponding live tables.

The live database is not identical to the V2 schema. It contains seven additional tables and several additional columns, including identity-verification, encrypted-intake/fingerprint, support-contact and settlement-terms fields. These additions must be preserved and understood in any V3 source model.

This is a positive compatibility signal, not proof that V2 code is drop-in compatible. It does not validate enum definitions, indexes, constraints, foreign-key semantics, data transformations, runtime queries, authorization, or application workflows. No migration should be generated or run from this inventory alone.

## Table inventory

- V2 advanced Drizzle schema tables: **36**
- Current Neon public tables: **43**
- V2 table names missing from Neon: **0**
- Additional Neon tables not declared in V2 `db/schema.ts`: **7**

Additional live tables:
- `auth_challenges`
- `auth_credentials`
- `auth_sessions`
- `credit_assessment_rules`
- `credit_assessment_transaction_evidence`
- `credit_assessment_transaction_evidence_reviews`
- `partner_commercial_terms`

These tables are part of the current V3 data model and must not be dropped or overwritten by a V2-derived schema.

## Observed additive live columns

The live database includes these columns beyond the explicitly declared V2 columns:

| Table | Additional live columns observed |
|---|---|
| `users` | `email_verified_at` |
| `application_intakes` | `applicant_email_fingerprint`, `applicant_pii_ciphertext` |
| `finance_applications` | `id_number_fingerprint` |
| `support_requests` | `phone` |
| `settlement_records` | `partner_commercial_terms_id`, `documentation_fee_rate_bps`, `facilitation_rate_bps`, `admin_fee_mode`, `admin_fixed_amount_cents` |

The V2 schema uses shared timestamp helpers for some tables; source-side parsing of inline column declarations does not expand those helper-generated columns. Common `created_at`/`updated_at` fields observed in Neon are therefore not treated as schema drift merely because they are supplied by a helper rather than declared inline.

## Compatibility cautions

1. Preserve the live V3-only authentication, encrypted intake, identity fingerprint, commercial-terms and transaction-evidence structures.
2. Verify enum values and ordering, defaults, nullability, unique/partial indexes, checks, foreign keys and delete behaviour before mapping V2 Drizzle models.
3. Review the settlement model carefully: live commercial-term linkage and rate/mode snapshots extend the V2 settlement model.
4. Preserve the V2 server-only applicant encryption boundary, but implement it using a verified Cloudflare Worker server/client boundary rather than copying the TanStack-specific marker mechanically.
5. Keep schema changes additive and branch-tested. Do not execute production DDL during source recovery.
6. Reconcile all runtime queries against the live schema and test applicant/partner/staff isolation before considering intake or uploads.

## Cloudflare preview build failure diagnosis

The Cloudflare preview build for commit `93421f41cc01e36e0d0eb62dbed9c647c8943455` ran the configured command:

```text
pnpm cf:build
```

It failed immediately because the repository root has no `package.json` (or `package.yaml` / `package.json5`). The preview log reports `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND`.

This is consistent with the V3 default branch and this recovery branch being documentation-only at present. It is not evidence of a failing application build, nor does it establish a production Worker failure. Do not add a dummy package manifest or weaken the build configuration just to make a documentation-only recovery branch appear deployable. When a real, verified application source tree is added, configure and validate its actual Cloudflare build command. No production Worker was changed by this failed preview.

## Safety outcome

- Read-only V2 source and Neon schema inspection only.
- No V2 or legacy repository changes.
- No database writes or migrations.
- No secrets, credentials, applicant records or document contents retrieved.
- No production Worker deployment or feature-flag change.
- Application submissions and document uploads remain disabled.
- Brevo, WhatsApp and HubSpot remain deferred to the final integration stage.
