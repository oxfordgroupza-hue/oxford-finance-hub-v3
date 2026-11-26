# V2 advanced workflow branch review for V3 recovery

**Review date:** 26 November 2026  
**Repositories/branches:** V2 `feat/oxford-application-workflows`, V2 `recovery/last-known-good-183ea211`; read-only review only.

## Branch and pull-request provenance

- V2 PR #3, `Oxford application workflows and credit assessment foundations`, is OPEN and DRAFT.
- Its head is `9c4ad86b27c30a7afe2366539b393ef51018afa5`; base is V2 main `4d578076e27b61d7ad8cbbf767cf876273724dc0`.
- PR #3 reports 249 commits and 72 changed files. The advanced branch is therefore substantially ahead of V2 main and must not be replaced with V2 main when recovering requirements or implementation history.
- V2 PR #4, `Recovery baseline: last known-good build (183ea211)`, is also OPEN and DRAFT. It points to the recovery commit and describes an isolated preview-validation purpose.
- Both PRs are historical V2 artefacts. They are not V3 pull requests and must remain untouched.

## PR #3 implementation inventory (source claims, not acceptance)

The PR description reports implementation of:

- Bureau-independent credit-assessment primitives and a verified debit-order reversal review rule.
- Industry/category/asset cascading catalogue and Super Admin catalogue workspace.
- Partner document upload controls, with server-side restrictions on applicant-sensitive documents.
- Office/Super Admin applicant intake and expiring applicant invitations; the applicant creates their own verified account.
- Partner referral registration without granting access to applicant documents.
- Encrypted customer draft resumption, subject to preview-only guards.
- Sign-out controls and preview-only demo role fixtures.
- Fee calculation primitives and tests.
- Append-only confirmed-settlement records, uniqueness protection and an office settlement view.
- Partner-scoped payout estimates that do not disclose Oxford's internal fee breakdown.

The PR description itself states that code presence and a successful build do not prove end-to-end or security acceptance.

## Outstanding items explicitly recorded by PR #3

- End-to-end Office intake, invitation delivery, verified applicant claim, draft completion, partner referral and notification testing.
- A completion-to-submission path for Office-created Draft applications.
- Isolated preview email-provider delivery testing.
- Complete credit-assessment data capture, calculations/report and Office review UI.
- Settlement validation, role restrictions, partner data isolation and reconciliation.
- Settlement correction/adjustment workflow.
- Partner payout notifications and payout reconciliation/status tracking, if required.
- Full role access, document isolation, storage, audit and application-lifecycle validation.
- Recovery and comparison of exact historical asset dropdown options.

These are outstanding claims in the V2 PR description, not assertions about current V3 implementation.

## V3 migration implications

1. Treat PR #3 and its advanced branch as the primary V2 workflow reference, not as a production-ready package.
2. Preserve the exact business rules and tests during source recovery, but reimplement/adapt the runtime integration layer for the current Cloudflare Workers + Hyperdrive/Neon + private Supabase Storage architecture.
3. Do not copy V2 Netlify runtime configuration, Netlify Identity, Netlify Database adapters, or Netlify Functions into V3.
4. Reconcile the V2 schema and migrations against the existing Neon schema before any migration is proposed. Do not execute production DDL as part of source recovery.
5. Keep all application submission, document-upload, settlement and provider-delivery safeguards fail-closed until their own controlled acceptance evidence exists.
6. Do not merge or modify V2 PR #3 or #4, or update V2 branches. V3 is the only destination for new work.
