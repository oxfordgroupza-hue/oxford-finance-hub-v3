# Transactional email delivery — V3

## Provider and boundary

V3 uses Brevo transactional email from Cloudflare Worker server functions. The Brevo API key is a server-only encrypted Worker secret. The ChatGPT Brevo connector is separate and does not configure the application runtime.

Neon is the authoritative queue/database. Messages must be created and processed server-side with explicit template and recipient allow-lists.

## Environment

- `BREVO_API_KEY` — encrypted server-only secret.
- `OXFORD_NOTIFICATION_FROM_EMAIL` — verified sender.
- `OXFORD_NOTIFICATION_FROM_NAME`.
- `OXFORD_NOTIFICATION_ADMIN_EMAIL`.
- `OXFORD_EMAIL_DELIVERY_ENABLED` — Preview gate.
- Recipient allow-list for the initial bootstrap/verification flow — approved Oxford-owned Preview mailbox only.

The branch Preview deployment contains the encrypted Brevo secret and approved sender/recipient configuration. No email has been sent in the current acceptance pass. Presence of the key does not prove delivery.

## Privacy and delivery rules

- Generate content and resolve recipients on the server.
- Use allow-listed template names and exact permitted recipients.
- Keep messages minimal and reference-based.
- Never include ID numbers, bank statements, payslips, private documents, passwords, verification tokens or application PDF packs as ordinary attachments.
- Keep marketing consent separate from transactional notices.
- Respect customer status-email preferences.
- Sanitize provider errors; never log secrets or raw provider response bodies.
- Retry only with bounded attempts and backoff. Record skipped/failed outcomes safely.
- Do not claim unattended scheduled delivery until a scheduled worker is implemented and tested.

## Acceptance gate

Test verification, recovery, staff invitation and queue/provider failure paths only to the approved Preview mailbox. Verify templates, sender, recipient allow-list, preference handling, retry and failure logging. No customer/partner email or WhatsApp delivery is authorised by this Preview configuration.

Production credentials, production delivery flags and any external customer/partner communication require separate approval.
