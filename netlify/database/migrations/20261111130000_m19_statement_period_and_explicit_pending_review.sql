-- M19: preserve the source statement's reporting period and explicit pending state.
-- Existing rows remain nullable because their statement period was never captured.
ALTER TABLE credit_assessment_transaction_evidence
  ADD COLUMN statement_period_start date,
  ADD COLUMN statement_period_end date,
  ADD COLUMN initial_classification text NOT NULL DEFAULT 'needs_review';

ALTER TABLE credit_assessment_transaction_evidence
  ADD CONSTRAINT credit_assessment_transaction_evidence_statement_period_check
    CHECK (
      (statement_period_start IS NULL AND statement_period_end IS NULL)
      OR
      (statement_period_start IS NOT NULL AND statement_period_end IS NOT NULL
       AND statement_period_start <= statement_period_end)
    ),
  ADD CONSTRAINT credit_assessment_transaction_evidence_initial_classification_check
    CHECK (initial_classification = 'needs_review');

DO $$
DECLARE
  existing_constraint record;
BEGIN
  -- PostgreSQL may truncate generated constraint names at 63 bytes.
  -- Identify the old classification CHECK by its definition, not its generated name.
  FOR existing_constraint IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'credit_assessment_transaction_evidence_reviews'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%classification%'
  LOOP
    EXECUTE format(
      'ALTER TABLE credit_assessment_transaction_evidence_reviews DROP CONSTRAINT %I',
      existing_constraint.conname
    );
  END LOOP;
END;
$$;

ALTER TABLE credit_assessment_transaction_evidence_reviews
  ADD CONSTRAINT cae_reviews_classification_check
    CHECK (classification IN ('needs_review', 'debit_order_reversal', 'not_a_debit_order_reversal'));
