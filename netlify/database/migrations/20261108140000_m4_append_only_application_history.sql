-- Preserve the evidentiary history of application status, consent and audit records.
CREATE OR REPLACE FUNCTION reject_oxford_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only; % is prohibited', TG_TABLE_NAME, TG_OP;
END;
$$;

CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_oxford_history_mutation();
CREATE TRIGGER audit_events_no_delete
  BEFORE DELETE ON audit_events FOR EACH ROW EXECUTE FUNCTION reject_oxford_history_mutation();
CREATE TRIGGER audit_events_no_truncate
  BEFORE TRUNCATE ON audit_events FOR EACH STATEMENT EXECUTE FUNCTION reject_oxford_history_mutation();

CREATE TRIGGER application_status_history_no_update
  BEFORE UPDATE ON application_status_history FOR EACH ROW EXECUTE FUNCTION reject_oxford_history_mutation();
CREATE TRIGGER application_status_history_no_delete
  BEFORE DELETE ON application_status_history FOR EACH ROW EXECUTE FUNCTION reject_oxford_history_mutation();
CREATE TRIGGER application_status_history_no_truncate
  BEFORE TRUNCATE ON application_status_history FOR EACH STATEMENT EXECUTE FUNCTION reject_oxford_history_mutation();

CREATE TRIGGER consent_records_no_update
  BEFORE UPDATE ON consent_records FOR EACH ROW EXECUTE FUNCTION reject_oxford_history_mutation();
CREATE TRIGGER consent_records_no_delete
  BEFORE DELETE ON consent_records FOR EACH ROW EXECUTE FUNCTION reject_oxford_history_mutation();
CREATE TRIGGER consent_records_no_truncate
  BEFORE TRUNCATE ON consent_records FOR EACH STATEMENT EXECUTE FUNCTION reject_oxford_history_mutation();
