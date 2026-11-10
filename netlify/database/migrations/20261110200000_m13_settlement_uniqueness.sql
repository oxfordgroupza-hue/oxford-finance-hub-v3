-- M13: tighten settlement uniqueness and clarify the immutable-record guard.
-- M12 is already applied and must remain byte-for-byte unchanged.
DROP INDEX IF EXISTS settlement_records_application_idx;
CREATE UNIQUE INDEX settlement_records_application_uq ON settlement_records(application_id);

CREATE OR REPLACE FUNCTION prevent_settlement_record_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Confirmed settlement records are immutable; no in-app correction workflow is available yet.';
END;
$$;
