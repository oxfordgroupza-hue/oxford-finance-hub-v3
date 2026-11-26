# Forms and request handling

Public enquiry forms must submit to the approved same-origin Cloudflare endpoint. Validate and normalize every field on the server, enforce consent, rate limits and spam controls, and return generic errors that do not disclose internal state.

- Do not collect identity documents, banking statements or sensitive applicant data through public enquiry forms.
- Finance applications and private document uploads remain separately gated.
- Preserve the form's pending, success and failure states.
- Require exact same-origin checks for mutations.
- Do not send messages to real recipients during routine testing.
