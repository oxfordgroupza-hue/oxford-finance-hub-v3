-- M11: secure Office-created applicant intake and one-time invitation lifecycle.
-- Intakes are not finance applications; finance_applications.customer_id remains NOT NULL.
CREATE TABLE application_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL,
  applicant_email text NOT NULL,
  applicant_type applicant_type NOT NULL,
  applicant_name text NOT NULL,
  phone text,
  category finance_category NOT NULL,
  asset_type_id uuid REFERENCES asset_types(id) ON DELETE SET NULL,
  industry_name_snapshot text,
  asset_category_name_snapshot text,
  asset_type_name_snapshot text,
  finance_amount integer,
  partner_registration_id uuid REFERENCES partner_registrations(id) ON DELETE SET NULL,
  creator_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  token_hash text NOT NULL,
  token_expires_at timestamptz NOT NULL,
  invitation_sent_at timestamptz,
  claimed_at timestamptz,
  revoked_at timestamptz,
  customer_id uuid REFERENCES customers(id) ON DELETE RESTRICT,
  application_id uuid REFERENCES finance_applications(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending_invitation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT application_intakes_status_check
    CHECK (status IN ('pending_invitation', 'invitation_sent', 'claimed', 'expired', 'revoked')),
  CONSTRAINT application_intakes_claim_consistency_check
    CHECK (
      (status = 'claimed' AND claimed_at IS NOT NULL AND customer_id IS NOT NULL AND application_id IS NOT NULL)
      OR
      (status <> 'claimed' AND claimed_at IS NULL AND customer_id IS NULL AND application_id IS NULL)
    ),
  CONSTRAINT application_intakes_reference_uq UNIQUE (reference),
  CONSTRAINT application_intakes_token_hash_uq UNIQUE (token_hash)
);
CREATE INDEX application_intakes_email_status_idx ON application_intakes(applicant_email, status);
CREATE INDEX application_intakes_creator_idx ON application_intakes(creator_user_id, created_at);
ALTER TABLE finance_applications
  ADD COLUMN creator_user_id uuid REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX finance_applications_creator_idx ON finance_applications(creator_user_id);
