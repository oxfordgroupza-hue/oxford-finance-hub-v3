# Oxford Project Operating Standard

Version: 1.0
Created: 2026-11-27

This document defines the working method to be copied into every Oxford project repository. It is a project-management and continuity document; it must not change application behaviour, production configuration, secrets, databases, DNS, or deployment settings.

## Purpose

Prevent project confusion, repeated work, unsupported claims, accidental production changes, and loss of progress between work sessions.

## Source-of-truth order

When information conflicts, use this order:

1. The current repository and its actual files.
2. The exact branch and commit being discussed or deployed.
3. Current provider configuration and deployment records.
4. Test reports, CI results, logs, and dated acceptance evidence.
5. The project's `PROJECT_STATE.md` record.
6. Conversation history and remembered context.

Conversation history is useful for intent and decisions, but it must not override newer technical evidence. If the evidence conflicts or cannot be established, stop and label the item unresolved rather than guessing.

## Mandatory start-of-session checks

Before proposing work, changing files, or asking the user to perform a task:

1. Confirm the exact project and repository.
2. Confirm the branch being inspected and its current commit.
3. Identify the actual deployment source branch/commit and production target, where applicable.
4. Read this standard and the project's `PROJECT_STATE.md`.
5. Check relevant recent commits, test evidence, deployment records, and known issues.
6. State what is already complete and what remains unresolved.
7. Select the smallest next action that addresses a verified outstanding item.

Do not assume the default branch is the production branch. Do not assume the most recently mentioned branch is still active.

## Rules against repeated work

- Never ask the user to repeat a test recorded as passed unless a specific change, regression, expiry, or mismatch makes a retest necessary.
- Before requesting a retest, identify what changed since the successful test and why that change affects the result.
- Preserve prior test evidence with its date, commit, environment, result, and source.
- Do not describe a test as independently verified unless its evidence was actually inspected in the current work.
- If the user reports a test passed but its evidence is not accessible, record it as user-reported passed, not as newly independently verified.

## Evidence and status labels

Use only these labels:

- **VERIFIED** — supported by current, inspected technical evidence.
- **USER-REPORTED PASS** — the user explicitly reported success, but the underlying evidence was not independently inspected.
- **PENDING** — not yet tested or not yet confirmed.
- **FAILED** — a failure is supported by evidence.
- **BLOCKED** — progress requires an identified dependency or permission.
- **NOT APPLICABLE** — the item does not apply to this project.

A successful build or deployment does not, by itself, prove that the live user journey works. Distinguish build, deployment, browser behaviour, integration delivery, data persistence, and end-to-end acceptance.

## Change safety

- Read before writing. Inspect the target file and branch before editing.
- Do not change production, deployment routing, DNS, secrets, access controls, databases, storage, or customer-facing workflows unless the user has authorised that specific change.
- Prefer a feature or documentation branch and a reviewable pull request for code changes.
- Documentation-only changes must be kept separate from application changes where practical.
- Never place secrets, private keys, credentials, personal customer data, or sensitive tokens in project records.
- Never invent environment values. Record secret names and whether they are configured; never record secret values.
- Before a change, state its intended scope and possible impact. After a change, record the exact commit and verification result.
- If a change fails, stop, preserve the error, and assess rollback rather than stacking speculative fixes.

## Required project record

Every repository using this standard should contain a `PROJECT_STATE.md` with:

1. Project identity and purpose.
2. Canonical repository URL.
3. Current working branch and commit (dated).
4. Production and preview targets, if applicable.
5. Deployment source branch and deployed commit, if applicable.
6. Completed features and decisions.
7. Test register: test, status label, date, environment, commit, evidence location.
8. Outstanding work, ordered by priority.
9. Confirmed defects and blockers.
10. Integrations and configuration status, recording names only—not secret values.
11. Recent change log with commit links.
12. Last verified date and next precise action.

Each project must have its own project-specific state. Never copy one project's URLs, branches, secrets, test results, architecture, or outstanding tasks into another project's state.

## Session close-out

At the end of meaningful work:

1. Update `PROJECT_STATE.md` with what changed and what did not change.
2. Record exact commit IDs and evidence links.
3. Mark tests with the correct evidence status.
4. List only genuinely outstanding work.
5. State whether production was affected.
6. Give one clear next action for the next session.

## Resume shorthand

If the user sends a recognised continuation shorthand (such as `.` or `>`), resume from the latest project record and verify the current repository state. Do not restart the project or ask the user to repeat known information. If the repository or state record is unavailable, explain the exact limitation and use available evidence before asking for anything.

## Project-specific status template

Use this structure in each project's `PROJECT_STATE.md`:

```md
# Project State

Last verified: YYYY-MM-DD
Status: IN PROGRESS | BLOCKED | MAINTENANCE | COMPLETE

## Identity
- Project:
- Purpose:
- Repository:
- Canonical production URL:

## Source and deployment
- Working branch:
- Working commit:
- Deployment provider:
- Deployment source branch:
- Deployed commit:
- Preview URL:
- Production URL:
- Production changed during last session: YES | NO

## Completed work
- [VERIFIED / USER-REPORTED PASS] Item — date, commit, evidence

## Test register
| Test | Status | Date | Environment | Commit | Evidence |
|---|---|---|---|---|---|

## Outstanding work
1. [PENDING] Specific task and why it remains outstanding.

## Confirmed defects and blockers
- None, or list evidence-backed items.

## Integrations and configuration
- Integration name — configured status; no secret values.

## Recent changes
- Date — change — commit — verification.

## Next action
- One specific, evidence-based next action.
```

This standard is a working control, not proof that any particular feature is complete. Project-specific facts must be verified and maintained separately.
