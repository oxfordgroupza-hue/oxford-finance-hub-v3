-- M14: append-only settlement reversals and corrections.
-- Original confirmed settlement rows remain immutable.
CREATE TABLE settlement_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES settlement_records(id) ON DELETE RESTRICT,
  application_id uuid NOT NULL REFERENCES finance_applications(id) ON DELETE RESTRICT,
  partner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  adjustment_reference text NOT NULL UNIQUE,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('reversal', 'correction')),
  reason text NOT NULL CHECK (length(trim(reason)) >= 10),
  actual_funder_settlement_delta_cents bigint NOT NULL,
  documentation_fee_delta_cents bigint NOT NULL,
  partner_gross_delta_cents bigint NOT NULL,
  facilitation_fee_delta_cents bigint NOT NULL,
  admin_fee_delta_cents bigint NOT NULL,
  partner_net_delta_cents bigint NOT NULL,
  oxford_total_fees_delta_cents bigint NOT NULL,
  recorded_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settlement_adjustments_reconciliation_check CHECK (
    partner_gross_delta_cents = actual_funder_settlement_delta_cents - documentation_fee_delta_cents
    AND partner_net_delta_cents = partner_gross_delta_cents - facilitation_fee_delta_cents - admin_fee_delta_cents
    AND oxford_total_fees_delta_cents = facilitation_fee_delta_cents + admin_fee_delta_cents
  )
);

CREATE UNIQUE INDEX settlement_adjustments_one_reversal_uq
  ON settlement_adjustments(settlement_id) WHERE adjustment_type = 'reversal';
CREATE UNIQUE INDEX settlement_adjustments_one_correction_uq
  ON settlement_adjustments(settlement_id) WHERE adjustment_type = 'correction';
CREATE INDEX settlement_adjustments_partner_idx
  ON settlement_adjustments(partner_user_id, created_at);
CREATE INDEX settlement_adjustments_settlement_idx
  ON settlement_adjustments(settlement_id, created_at);

CREATE OR REPLACE FUNCTION prevent_settlement_adjustment_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Settlement adjustments are append-only; create a new authorised adjustment instead.';
END;
$$;

CREATE TRIGGER settlement_adjustments_immutable
BEFORE UPDATE OR DELETE ON settlement_adjustments
FOR EACH ROW EXECUTE FUNCTION prevent_settlement_adjustment_mutation();
