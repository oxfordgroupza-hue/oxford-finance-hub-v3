-- M18: persist bank-statement transaction evidence and append-only human classifications.
-- Transaction date, amount and statement narrative are encrypted together by the server.
CREATE TABLE credit_assessment_transaction_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES finance_applications(id) ON DELETE RESTRICT,
  source_document_id uuid NOT NULL REFERENCES application_documents(id) ON DELETE RESTRICT,
  transaction_details_ciphertext text NOT NULL,
  evidence_fingerprint text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX credit_assessment_transaction_evidence_dedup_uq
  ON credit_assessment_transaction_evidence(application_id, source_document_id, evidence_fingerprint);

CREATE INDEX credit_assessment_transaction_evidence_application_idx
  ON credit_assessment_transaction_evidence(application_id, created_at);
CREATE INDEX credit_assessment_transaction_evidence_source_document_idx
  ON credit_assessment_transaction_evidence(source_document_id);

CREATE TABLE credit_assessment_transaction_evidence_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL REFERENCES credit_assessment_transaction_evidence(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  classification text NOT NULL
    CHECK (classification IN ('debit_order_reversal', 'not_a_debit_order_reversal')),
  reviewer_note text NOT NULL DEFAULT '',
  reviewed_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credit_assessment_transaction_evidence_reviews_version_uq UNIQUE (evidence_id, version)
);

CREATE INDEX credit_assessment_transaction_evidence_reviews_latest_idx
  ON credit_assessment_transaction_evidence_reviews(evidence_id, version);

CREATE OR REPLACE FUNCTION prevent_credit_assessment_evidence_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Credit assessment transaction evidence and review history are append-only.';
END;
$$;

CREATE TRIGGER credit_assessment_transaction_evidence_immutable
BEFORE UPDATE OR DELETE ON credit_assessment_transaction_evidence
FOR EACH ROW EXECUTE FUNCTION prevent_credit_assessment_evidence_mutation();

CREATE TRIGGER credit_assessment_transaction_evidence_reviews_immutable
BEFORE UPDATE OR DELETE ON credit_assessment_transaction_evidence_reviews
FOR EACH ROW EXECUTE FUNCTION prevent_credit_assessment_evidence_mutation();
