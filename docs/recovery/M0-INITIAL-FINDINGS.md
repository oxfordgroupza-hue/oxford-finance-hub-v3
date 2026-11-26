# V3 initial recovery findings — superseded baseline

This file records the initial recovery phase only. Its deployment and provider status is historical; the current source, architecture and release verdict are maintained in README.md, docs/RELEASE_READINESS.md and the Cloudflare Preview acceptance report.

- The V3 repository was established as the only authorised development target; earlier repositories remain read-only references.
- The application schema, workflows, tests, user interface, imagery and business rules were recovered as an editable V3 source baseline.
- The current architecture is Cloudflare Workers, Oxford-owned Cloudflare-native authentication, Neon PostgreSQL via Hyperdrive and private Supabase Storage.
- The production domain is attached to the Cloudflare Worker. Production applications and document uploads remain disabled.
- No live applicant processing, document upload, payment, settlement or payout is permitted until the current release gates pass.
- The active development branch and exact build evidence are recorded in the current README and release-readiness report.
