-- M16: enforce the per-application document cap under concurrent uploads.
-- Lock the parent application row so concurrent inserts serialize before counting.
CREATE OR REPLACE FUNCTION enforce_application_document_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  existing_count integer;
BEGIN
  PERFORM 1
  FROM finance_applications
  WHERE id = NEW.application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application does not exist.';
  END IF;

  SELECT count(*)::integer
  INTO existing_count
  FROM application_documents
  WHERE application_id = NEW.application_id;

  IF existing_count >= 20 THEN
    RAISE EXCEPTION 'An application may contain no more than 20 documents.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER application_documents_limit_before_insert
BEFORE INSERT ON application_documents
FOR EACH ROW
EXECUTE FUNCTION enforce_application_document_limit();
