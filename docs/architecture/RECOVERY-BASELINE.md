# V3 recovery baseline

The initial V3 repository was empty. This source snapshot is recovered from V2 advanced workflow commit `9c4ad86b27c30a7afe2366539b393ef51018afa5`, with V2 recovery commit `183ea2117d4be9a587a1632f68e8245091a72897` retained as a comparison point. V2 and legacy repositories remain unchanged.

## Import choices
- Imported application source, database schema, migrations, tests, UI, functions and assets from the advanced branch.
- Excluded obsolete V2 operational instructions, old site-ID-specific Netlify setup, outdated Supabase database migration notes, WhatsApp setup notes and internal commercial workflow notes.
- Replaced V2-only repository instructions and roadmap with V3-specific rules.
- Removed confidential fee rates from the public source and tests. The fee calculator fails closed until approved terms are supplied through restricted server-side configuration.
- Removed the V2 Netlify site-ID guard. Deployments are deliberately skipped until a V3 site ID is verified.
- Preserved migration files as source only. No database migrations have been run by this import.

## Known remediation items
- Correct the stale import in the server-only PII encryption test.
- Restrict Partner role to referrals, profile, support, permitted supplier uploads and own payout view. Remove customer application/document permissions.
- Ensure customer application server actions accept customers only.
- Remove customer application/draft loaders and general applicant-document panels from Partner workspace.
- Route normal sign-in to the role-resolved workspace rather than hard-coding the customer dashboard.
- Make provisioning conflicts explicit and keep Super Admin bootstrap Deploy Preview-only.
- Complete partner referral starter-intake workflow and server-verified credit reversal evidence.
- Run full validation and inspect detailed Deploy Preview logs after the V3 Netlify site is configured.

## Current release gates
Applications, uploads, transactional notifications and settlement recording remain disabled. This import does not establish provider-level or end-to-end acceptance.
