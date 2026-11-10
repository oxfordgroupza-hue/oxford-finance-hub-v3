-- M15: validate settlement adjustment ordering and reversal reconciliation.
-- This extends the already-applied M14 ledger without rewriting its migration.

CREATE OR REPLACE FUNCTION validate_settlement_adjustment_insert()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  original settlement_records%ROWTYPE;
  effective_actual bigint;
  effective_documentation bigint;
  effective_gross bigint;
  effective_facilitation bigint;
  effective_admin bigint;
  effective_net bigint;
  effective_oxford bigint;
BEGIN
  SELECT * INTO original FROM settlement_records
    WHERE id = NEW.settlement_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original settlement does not exist.';
  END IF;

  IF NEW.adjustment_type = 'correction' THEN
    IF EXISTS (SELECT 1 FROM settlement_adjustments WHERE settlement_id = NEW.settlement_id) THEN
      RAISE EXCEPTION 'A settlement can only be corrected once and cannot be corrected after reversal.';
    END IF;
    RETURN NEW;
  END IF;

  SELECT
    original.actual_funder_settlement_amount_cents + COALESCE(sum(actual_funder_settlement_delta_cents), 0),
    original.documentation_fee_cents + COALESCE(sum(documentation_fee_delta_cents), 0),
    original.partner_gross_payable_cents + COALESCE(sum(partner_gross_delta_cents), 0),
    original.facilitation_fee_cents + COALESCE(sum(facilitation_fee_delta_cents), 0),
    original.admin_fee_cents + COALESCE(sum(admin_fee_delta_cents), 0),
    original.partner_net_payable_cents + COALESCE(sum(partner_net_delta_cents), 0),
    original.oxford_total_fees_cents + COALESCE(sum(oxford_total_fees_delta_cents), 0)
  INTO effective_actual, effective_documentation, effective_gross,
       effective_facilitation, effective_admin, effective_net, effective_oxford
  FROM settlement_adjustments WHERE settlement_id = NEW.settlement_id;

  IF EXISTS (SELECT 1 FROM settlement_adjustments WHERE settlement_id = NEW.settlement_id AND adjustment_type = 'reversal') THEN
    RAISE EXCEPTION 'This settlement has already been reversed.';
  END IF;

  IF NEW.actual_funder_settlement_delta_cents <> -effective_actual
    OR NEW.documentation_fee_delta_cents <> -effective_documentation
    OR NEW.partner_gross_delta_cents <> -effective_gross
    OR NEW.facilitation_fee_delta_cents <> -effective_facilitation
    OR NEW.admin_fee_delta_cents <> -effective_admin
    OR NEW.partner_net_delta_cents <> -effective_net
    OR NEW.oxford_total_fees_delta_cents <> -effective_oxford THEN
    RAISE EXCEPTION 'Reversal values do not match the latest effective settlement. Refresh and retry.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER settlement_adjustments_validate_insert
BEFORE INSERT ON settlement_adjustments
FOR EACH ROW EXECUTE FUNCTION validate_settlement_adjustment_insert();
