-- M12: append-only confirmed funder settlement snapshots.
-- A confirmed row is immutable; corrections must be handled by a separately
-- authorised reversal/adjustment workflow rather than editing historical fees.
CREATE TABLE settlement_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES finance_applications(id) ON DELETE RESTRICT,
  partner_registration_id uuid NOT NULL REFERENCES partner_registrations(id) ON DELETE RESTRICT,
  partner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  application_reference_snapshot text NOT NULL,
  partner_business_name_snapshot text NOT NULL,
  settlement_reference text NOT NULL UNIQUE,
  currency text NOT NULL DEFAULT 'ZAR' CHECK (currency = 'ZAR'),
  approved_finance_amount_cents bigint NOT NULL CHECK (approved_finance_amount_cents > 0),
  actual_funder_settlement_amount_cents bigint NOT NULL CHECK (actual_funder_settlement_amount_cents > 0),
  documentation_fee_cents bigint NOT NULL CHECK (documentation_fee_cents >= 0),
  partner_gross_payable_cents bigint NOT NULL CHECK (partner_gross_payable_cents >= 0),
  facilitation_fee_cents bigint NOT NULL CHECK (facilitation_fee_cents >= 0),
  admin_fee_cents bigint NOT NULL CHECK (admin_fee_cents >= 0),
  partner_net_payable_cents bigint NOT NULL CHECK (partner_net_payable_cents >= 0),
  oxford_total_fees_cents bigint NOT NULL CHECK (oxford_total_fees_cents >= 0),
  admin_rate_bps integer NOT NULL CHECK (admin_rate_bps >= 0),
  terms_version text NOT NULL,
  settled_at timestamptz NOT NULL,
  recorded_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settlement_records_reconciliation_check CHECK (
    partner_gross_payable_cents = actual_funder_settlement_amount_cents - documentation_fee_cents
    AND partner_net_payable_cents = partner_gross_payable_cents - facilitation_fee_cents - admin_fee_cents
    AND oxford_total_fees_cents = facilitation_fee_cents + admin_fee_cents
  )
);

CREATE INDEX settlement_records_application_idx ON settlement_records(application_id, settled_at);
CREATE INDEX settlement_records_partner_idx ON settlement_records(partner_user_id, settled_at);

CREATE OR REPLACE FUNCTION prevent_settlement_record_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Confirmed settlement records are immutable; create an authorised adjustment record instead.';
END;
$$;

CREATE TRIGGER settlement_records_immutable
BEFORE UPDATE OR DELETE ON settlement_records
FOR EACH ROW EXECUTE FUNCTION prevent_settlement_record_mutation();
