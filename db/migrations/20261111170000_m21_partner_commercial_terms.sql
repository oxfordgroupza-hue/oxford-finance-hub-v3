-- M21: immutable partner-specific commercial terms and settlement snapshots.
-- No global facilitation/admin rates are seeded. Each partner requires explicit Super Admin approval.

CREATE TABLE partner_commercial_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_registration_id uuid NOT NULL REFERENCES partner_registrations(id) ON DELETE RESTRICT,
  version integer NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  facilitation_rate_bps integer NOT NULL,
  admin_fee_mode text NOT NULL,
  admin_rate_bps integer NOT NULL,
  admin_fixed_amount_cents bigint,
  rationale text NOT NULL,
  created_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  approved_by uuid REFERENCES users(id) ON DELETE RESTRICT,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT partner_commercial_terms_version_check CHECK (version > 0),
  CONSTRAINT partner_commercial_terms_status_check CHECK (status IN ('draft', 'active', 'superseded')),
  CONSTRAINT partner_commercial_terms_rationale_check CHECK (length(btrim(rationale)) >= 10),
  CONSTRAINT partner_commercial_terms_facilitation_rate_check CHECK (facilitation_rate_bps BETWEEN 0 AND 10000),
  CONSTRAINT partner_commercial_terms_admin_rate_check CHECK (admin_rate_bps BETWEEN 0 AND 10000),
  CONSTRAINT partner_commercial_terms_admin_mode_check CHECK (admin_fee_mode IN ('percentage', 'fixed')),
  CONSTRAINT partner_commercial_terms_admin_value_check CHECK (
    (admin_fee_mode = 'percentage' AND admin_fixed_amount_cents IS NULL AND facilitation_rate_bps + admin_rate_bps <= 10000)
    OR (admin_fee_mode = 'fixed' AND admin_rate_bps = 0 AND admin_fixed_amount_cents IS NOT NULL AND admin_fixed_amount_cents >= 0)
  ),
  CONSTRAINT partner_commercial_terms_approval_check CHECK (
    (status = 'active' AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
    OR (status = 'draft' AND approved_by IS NULL AND approved_at IS NULL)
    OR status = 'superseded'
  ),
  CONSTRAINT partner_commercial_terms_partner_version_uq UNIQUE (partner_registration_id, version)
);

CREATE UNIQUE INDEX partner_commercial_terms_single_active_uq
  ON partner_commercial_terms (partner_registration_id)
  WHERE status = 'active';

CREATE INDEX partner_commercial_terms_partner_status_idx
  ON partner_commercial_terms (partner_registration_id, status, version DESC);

ALTER TABLE settlement_records
  ADD COLUMN partner_commercial_terms_id uuid REFERENCES partner_commercial_terms(id) ON DELETE RESTRICT,
  ADD COLUMN documentation_fee_rate_bps integer NOT NULL DEFAULT 100,
  ADD COLUMN facilitation_rate_bps integer,
  ADD COLUMN admin_fee_mode text,
  ADD COLUMN admin_fixed_amount_cents bigint;

ALTER TABLE settlement_records
  ADD CONSTRAINT settlement_records_documentation_rate_check
    CHECK (documentation_fee_rate_bps = 100),
  ADD CONSTRAINT settlement_records_terms_snapshot_check CHECK (
    (partner_commercial_terms_id IS NULL AND facilitation_rate_bps IS NULL AND admin_fee_mode IS NULL AND admin_fixed_amount_cents IS NULL)
    OR
    (partner_commercial_terms_id IS NOT NULL AND facilitation_rate_bps BETWEEN 0 AND 10000 AND (
      (admin_fee_mode = 'percentage' AND admin_fixed_amount_cents IS NULL AND facilitation_rate_bps + admin_rate_bps <= 10000)
      OR (admin_fee_mode = 'fixed' AND admin_rate_bps = 0 AND admin_fixed_amount_cents IS NOT NULL AND admin_fixed_amount_cents >= 0)
    ))
  );

CREATE INDEX settlement_records_partner_terms_idx
  ON settlement_records (partner_commercial_terms_id);
