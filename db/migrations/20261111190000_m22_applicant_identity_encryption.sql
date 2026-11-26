-- M22: Store new applicant intake identity data only in authenticated ciphertext.
-- Existing legacy rows remain readable through the server-side compatibility path;
-- a keyed backfill is required before any legacy row is considered release-ready.
ALTER TABLE application_intakes
  ALTER COLUMN applicant_email DROP NOT NULL,
  ALTER COLUMN applicant_name DROP NOT NULL;

ALTER TABLE application_intakes
  ADD COLUMN applicant_email_fingerprint text,
  ADD COLUMN applicant_pii_ciphertext text;

DROP INDEX IF EXISTS application_intakes_email_status_idx;

CREATE INDEX application_intakes_email_fingerprint_status_idx
  ON application_intakes (applicant_email_fingerprint, status);

ALTER TABLE application_intakes
  ADD CONSTRAINT application_intakes_pii_consistency_check
  CHECK (
    (applicant_pii_ciphertext IS NULL AND applicant_email_fingerprint IS NULL)
    OR
    (applicant_pii_ciphertext IS NOT NULL AND applicant_email_fingerprint IS NOT NULL)
  ),
  ADD CONSTRAINT application_intakes_pii_envelope_consistency_check
  CHECK (
    applicant_pii_ciphertext IS NULL
    OR (applicant_email IS NULL AND applicant_name IS NULL AND phone IS NULL)
  );

ALTER TABLE customers
  ADD CONSTRAINT customers_pii_envelope_consistency_check
  CHECK (
    profile ->> 'piiCiphertext' IS NULL
    OR (
      first_name IS NULL AND last_name IS NULL AND business_name IS NULL AND phone IS NULL
      AND NOT (
        profile ? 'firstName' OR profile ? 'lastName' OR profile ? 'businessName'
        OR profile ? 'tradingName' OR profile ? 'email' OR profile ? 'phone'
        OR profile ? 'supplier' OR profile ? 'applicantName' OR profile ? 'contactName'
        OR profile ? 'comments' OR profile ? 'idType' OR profile ? 'idNumber'
        OR profile ? 'dateOfBirth' OR profile ? 'address' OR profile ? 'employmentStatus'
        OR profile ? 'employer' OR profile ? 'grossMonthlyIncome' OR profile ? 'netMonthlyIncome'
        OR profile ? 'registrationNumber' OR profile ? 'yearsTrading' OR profile ? 'industry'
        OR profile ? 'businessAddress' OR profile ? 'annualTurnover' OR profile ? 'directors'
      )
    )
  );
