# Forms and server-side validation

All application forms submit to typed Tanstack Start server functions or the dedicated Cloudflare API routes. Do not rely on client-side validation alone.

- Validate input with Zod on the server.
- Enforce same-origin and approved-host checks for sensitive operations.
- Apply authentication and authorization before reading or changing protected records.
- Use generic responses for account recovery to avoid disclosing registered addresses.
- Never accept identity documents or bank statements through public general-enquiry forms.
- Keep application intake and document uploads disabled in Production until the security and legal acceptance gates pass.
- Do not include passwords, tokens, private document URLs or personal information in logs or analytics.
