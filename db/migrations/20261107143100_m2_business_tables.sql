-- M2 business workflow tables.
CREATE TABLE finance_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reference text NOT NULL,
 customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
 applicant_type applicant_type NOT NULL, category finance_category NOT NULL,
 status application_status NOT NULL DEFAULT 'Submitted', priority priority NOT NULL DEFAULT 'Medium',
 finance_amount integer, asset_description text, referral_code text, submitted_at timestamptz,
 provider_decision text CHECK(provider_decision IS NULL OR provider_decision IN ('approved','declined','withdrawn')),
 application_data jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX finance_applications_reference_uq ON finance_applications(reference);
CREATE INDEX finance_applications_customer_idx ON finance_applications(customer_id);
CREATE INDEX finance_applications_status_idx ON finance_applications(status);
CREATE INDEX finance_applications_referral_idx ON finance_applications(referral_code);
CREATE TABLE finance_drafts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
 idempotency_key text NOT NULL, applicant_type applicant_type NOT NULL, category finance_category NOT NULL,
 referral_code text, draft_data jsonb NOT NULL DEFAULT '{}'::jsonb, expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX finance_drafts_idempotency_key_uq ON finance_drafts(idempotency_key);
CREATE INDEX finance_drafts_customer_idx ON finance_drafts(customer_id);
CREATE TABLE application_packs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES finance_applications(id) ON DELETE CASCADE,
 file_name text NOT NULL, storage_key text, generated_at timestamptz NOT NULL DEFAULT now(),
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX application_packs_application_idx ON application_packs(application_id);
CREATE TABLE application_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES finance_applications(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT, document_type text NOT NULL,
 original_name text NOT NULL, mime_type text NOT NULL, size_bytes integer NOT NULL CHECK(size_bytes >= 0),
 status document_status NOT NULL DEFAULT 'Outstanding', provider text, provider_item_id text, storage_path text,
 checksum text, uploaded_at timestamptz, verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
 verified_at timestamptz, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_documents_application_idx ON application_documents(application_id);
CREATE INDEX application_documents_customer_idx ON application_documents(customer_id);
CREATE TABLE application_status_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES finance_applications(id) ON DELETE CASCADE,
 from_status text, to_status application_status NOT NULL, changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
 note text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX application_status_history_application_idx ON application_status_history(application_id,created_at);
CREATE TABLE assignments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES finance_applications(id) ON DELETE CASCADE,
 assigned_to uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT, assigned_by uuid REFERENCES users(id) ON DELETE SET NULL,
 assigned_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE INDEX assignments_assignee_idx ON assignments(assigned_to);
CREATE INDEX assignments_application_idx ON assignments(application_id);
CREATE TABLE consent_records (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES finance_applications(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE RESTRICT, consent_type consent_type NOT NULL,
 accepted boolean NOT NULL, wording_version text NOT NULL, ip_address text, user_agent text,
 recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX consent_records_application_idx ON consent_records(application_id);
CREATE TABLE referrals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), partner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 code text NOT NULL, application_id uuid REFERENCES finance_applications(id) ON DELETE SET NULL,
 referred_at timestamptz NOT NULL DEFAULT now(), metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE UNIQUE INDEX referrals_code_uq ON referrals(code);
CREATE INDEX referrals_partner_idx ON referrals(partner_user_id);
CREATE TABLE partner_registrations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 business_name text NOT NULL, contact_name text NOT NULL, email text NOT NULL, phone text,
 status partner_status NOT NULL DEFAULT 'Pending approval', referral_code text,
 details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX partner_registrations_referral_code_uq ON partner_registrations(referral_code);
CREATE INDEX partner_registrations_status_idx ON partner_registrations(status);
CREATE TABLE customer_preferences (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 preferences jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customer_preferences_customer_uq ON customer_preferences(customer_id);
CREATE TABLE office_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES finance_applications(id) ON DELETE CASCADE,
 author_user_id uuid REFERENCES users(id) ON DELETE SET NULL, body text NOT NULL, is_internal boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX office_notes_application_idx ON office_notes(application_id);
CREATE TABLE office_application_summaries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES finance_applications(id) ON DELETE CASCADE,
 summary text NOT NULL, generated_by text NOT NULL DEFAULT 'human', generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX office_application_summaries_application_uq ON office_application_summaries(application_id);
CREATE TABLE support_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 channel support_channel NOT NULL, status support_status NOT NULL DEFAULT 'Open',
 name text NOT NULL, email text NOT NULL, subject text NOT NULL, message text NOT NULL,
 assigned_to uuid REFERENCES users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX support_requests_status_idx ON support_requests(status);
CREATE TABLE enquiry_assessments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), support_request_id uuid REFERENCES support_requests(id) ON DELETE CASCADE,
 score integer, priority priority NOT NULL DEFAULT 'Medium', rationale text, assessed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id) ON DELETE CASCADE,
 channel text NOT NULL, template text NOT NULL, status text NOT NULL DEFAULT 'queued',
 payload jsonb NOT NULL DEFAULT '{}'::jsonb, attempts integer NOT NULL DEFAULT 0, last_error text, sent_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_status_idx ON notifications(user_id,status);
CREATE TABLE integration_operations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, operation text NOT NULL,
 idempotency_key text NOT NULL, status text NOT NULL DEFAULT 'pending',
 request_metadata jsonb NOT NULL DEFAULT '{}'::jsonb, result_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 attempts integer NOT NULL DEFAULT 0, last_error text, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX integration_operations_idempotency_key_uq ON integration_operations(idempotency_key);
CREATE INDEX integration_operations_status_idx ON integration_operations(status);
CREATE TABLE audit_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 event text NOT NULL, resource text NOT NULL, resource_id text, details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_created_idx ON audit_events(created_at);
CREATE TABLE site_content (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL, title text NOT NULL, body text NOT NULL,
 status text NOT NULL DEFAULT 'draft', updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX site_content_key_uq ON site_content(key);
