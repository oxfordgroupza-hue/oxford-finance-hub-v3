-- M17: private, versioned human credit-assessment reports.
-- The current row is the latest reviewer worksheet; every save also creates an immutable snapshot.
CREATE TABLE credit_assessment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES finance_applications(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'ready_for_human_decision')),
  report jsonb NOT NULL,
  latest_version integer NOT NULL DEFAULT 1 CHECK (latest_version > 0),
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  updated_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credit_assessment_reports_application_uq UNIQUE (application_id)
);

CREATE INDEX credit_assessment_reports_status_idx
  ON credit_assessment_reports(status, updated_at DESC);

CREATE TABLE credit_assessment_report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES credit_assessment_reports(id) ON DELETE RESTRICT,
  application_id uuid NOT NULL REFERENCES finance_applications(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL
    CHECK (status IN ('not_started', 'in_progress', 'ready_for_human_decision')),
  report jsonb NOT NULL,
  saved_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credit_assessment_report_versions_version_uq UNIQUE (report_id, version)
);

CREATE INDEX credit_assessment_report_versions_application_idx
  ON credit_assessment_report_versions(application_id, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_credit_assessment_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Credit assessment report versions are append-only.';
END;
$$;

CREATE TRIGGER credit_assessment_report_versions_immutable
BEFORE UPDATE OR DELETE ON credit_assessment_report_versions
FOR EACH ROW EXECUTE FUNCTION prevent_credit_assessment_version_mutation();
