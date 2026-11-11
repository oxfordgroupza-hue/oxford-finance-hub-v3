-- M20: versioned, Super Administrator-approved 100-point credit assessment rules.
-- No active ruleset is seeded: the initial weighting must be configured and approved by Oxford.

CREATE TABLE credit_assessment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  verified_income_and_stability integer NOT NULL,
  affordability_and_disposable_income integer NOT NULL,
  existing_financial_commitments integer NOT NULL,
  bank_statement_behaviour integer NOT NULL,
  employment_or_business_stability integer NOT NULL,
  document_consistency_and_verification integer NOT NULL,
  rationale text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credit_assessment_rules_version_positive_check CHECK (version > 0),
  CONSTRAINT credit_assessment_rules_status_check CHECK (status IN ('draft', 'active', 'superseded')),
  CONSTRAINT credit_assessment_rules_rationale_check CHECK (length(btrim(rationale)) >= 10),
  CONSTRAINT credit_assessment_rules_approval_check CHECK (
    (status = 'active' AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    OR (status = 'draft' AND approved_by IS NULL AND approved_at IS NULL)
    OR status = 'superseded'
  ),
  CONSTRAINT credit_assessment_rules_weights_check CHECK (
    verified_income_and_stability >= 0
    AND affordability_and_disposable_income >= 0
    AND existing_financial_commitments >= 0
    AND bank_statement_behaviour >= 0
    AND employment_or_business_stability >= 0
    AND document_consistency_and_verification >= 0
    AND verified_income_and_stability
      + affordability_and_disposable_income
      + existing_financial_commitments
      + bank_statement_behaviour
      + employment_or_business_stability
      + document_consistency_and_verification = 100
  ),
  CONSTRAINT credit_assessment_rules_version_uq UNIQUE (version)
);

CREATE UNIQUE INDEX credit_assessment_rules_single_active_uq
  ON credit_assessment_rules (status)
  WHERE status = 'active';

CREATE INDEX credit_assessment_rules_status_idx
  ON credit_assessment_rules (status, version DESC);
