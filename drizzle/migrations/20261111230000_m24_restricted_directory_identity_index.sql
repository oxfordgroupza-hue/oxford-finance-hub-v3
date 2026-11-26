-- M24: Add a keyed, non-reversible identity lookup index for restricted directory search.
-- The actual ID/passport number remains only inside the encrypted application PII envelope.
ALTER TABLE finance_applications
  ADD COLUMN id_number_fingerprint text;

CREATE INDEX finance_applications_identity_fingerprint_idx
  ON finance_applications (id_number_fingerprint)
  WHERE id_number_fingerprint IS NOT NULL;
