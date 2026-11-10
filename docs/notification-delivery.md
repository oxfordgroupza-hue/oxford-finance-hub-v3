# Transactional email delivery — Oxford Finance Hub

## Provider

The application uses the Brevo transactional email API. Email content is generated server-side; the browser never receives the API key. The office notification panel displays queue status and can process queued messages when the provider is fully configured.

## Netlify variables

Configure these on the Oxford Finance Hub Netlify site, scoped to Functions:

- BREVO_API_KEY — secret transactional API key.
- OXFORD_NOTIFICATION_FROM_EMAIL — an active, verified Brevo sender address.
- OXFORD_NOTIFICATION_FROM_NAME — optional sender display name; defaults to Oxford Finance Hub.
- OXFORD_NOTIFICATION_ADMIN_EMAIL — the office inbox that receives new support and partner-registration alerts.
- OXFORD_EMAIL_DELIVERY_ENABLED — leave false or unset until sender verification and a controlled test are complete. Set true only after the test gate below passes.

The Brevo account connection in ChatGPT is separate from the application runtime. It does not automatically place an API key in Netlify. The application must not try to read or reuse the ChatGPT connector credential.

## Supported transactional messages

- application_received — sent to the applicant after submission.
- application_status_updated — sent to the applicant after an application status change, unless the applicant has disabled status emails.
- new_support_request — office alert that a support request is waiting in the authenticated office inbox.
- new_partner_registration — office alert that a partner registration is waiting for review.
- partner_referral_registered — sent to an approved merchant partner when Office or Super Admin registers that partner as the referrer on an existing application. It contains only the application reference and selected asset description; it explicitly confirms that no applicant document access is granted.

Emails contain only the application reference or a generic inbox alert. They do not include identity numbers, bank details, supporting documents, or generated PDF packs.

Marketing email consent is separate from transactional status notifications. The queue processor must not use transactional consent to send marketing messages.

## Processing

Authorised office users can review the notification queue. Users with notifications.manage can process queued and retryable failed messages. A message is skipped if no eligible recipient exists; failed attempts are capped at five.

Delivery is manual from the office workspace. No scheduled worker is enabled yet. This avoids unattended sending until the sender, reply address, office recipient and retry behaviour have been verified.

## Test gate

1. Configure a verified sender and API key in the Deploy Preview context only.
2. Keep OXFORD_EMAIL_DELIVERY_ENABLED false while checking the queue and recipient resolution.
3. Enable it in the Deploy Preview only and use a controlled test inbox owned by the Oxford team.
4. Confirm each supported template, sender identity, reply handling and unsubscribe/marketing separation.
5. Confirm the status-email preference is respected.
6. Confirm no identity, financial or document content appears in the email.
7. Confirm provider failures are recorded without exposing API response bodies or secrets.
8. Only after approval should production credentials and the production delivery flag be considered.

No test or customer email is sent by the code merely because the API key exists. The explicit OXFORD_EMAIL_DELIVERY_ENABLED flag must also be true.
