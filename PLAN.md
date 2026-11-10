# Oxford Finance Hub V3 — recovery and delivery plan

**Current state:** initial source import and remediation. Not production-ready.

The controlling reference is the V3 master project specification dated 10 November 2026. V2 and the legacy repository are recovery-only.

| Milestone | Scope | Current state |
|---|---|---|
| M0 | Repository recovery, comparison, sanitised import | In progress |
| M1 | Full audit, architecture and evidence register | Initial audit recorded; continue |
| M2 | Database/core domain and migrations | Source imported; validation pending |
| M3 | Identity provisioning and authentication | Defects identified; remediation pending |
| M4 | Roles, permissions and Super Admin | Partner permission corrections required |
| M5 | Public site and customer application | Source imported; end-to-end verification pending |
| M6 | Customer and Office lifecycle | Source imported; verification pending |
| M7 | Partner referrals, linking and Office intake | Partner isolation corrections required |
| M8 | Commercial fee model | Terms not approved; public rate logic removed and gated |
| M9 | Settlements and payouts | Gate remains closed |
| M10 | Internal credit assessment | Source imported; evidence capture audit pending |
| M11 | Private document storage | Provider configuration checked read-only; integration tests pending |
| M12 | Notifications and automation | Delivery disabled; tests pending |
| M13 | Security and QA | Initial static review only |
| M14 | Staging and acceptance | Not started |
| M15 | Production | Requires separate explicit approval |

## Acceptance evidence states
Use these exact distinctions: implemented in source; automated tests passing; Deploy Preview verified; real provider/account test verified; awaiting business approval; blocked by missing configuration/external action; not yet implemented.

## Release restrictions
No production deployment, live applications, document upload, email/WhatsApp delivery, settlement execution, payment or payout processing until separate approval and acceptance evidence are recorded. Legal and regulatory readiness requires qualified professional review.
