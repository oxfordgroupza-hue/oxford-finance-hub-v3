# Known issues and release blockers

1. The designated initial Super Administrator account is still unverified and has no active Super Administrator assignment.
2. The authentication email send path has not been fully verified against the live production Worker.
3. Production application intake, document uploads and notification delivery are deliberately disabled.
4. The Neon migration baseline and migration-history process must be verified before any production migration is applied.
5. The production build trigger has shown a queued state without initialization. Do not report a build as successful until its final status and logs confirm it.
6. POPIA, FICA and National Credit Act readiness has not been independently certified.

These are release gates, not reasons to weaken access controls or enable customer processing prematurely.
