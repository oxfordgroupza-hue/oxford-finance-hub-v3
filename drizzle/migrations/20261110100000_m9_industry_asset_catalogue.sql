-- M9: Add a centrally managed, cascading industry and asset catalogue.
-- This is additive: the existing broad finance_products catalogue remains intact.
-- No guessed legacy options are seeded. Super Admin can populate the confirmed catalogue.

CREATE TABLE asset_industries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX asset_industries_name_uq ON asset_industries(name);

CREATE TABLE asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_id uuid NOT NULL REFERENCES asset_industries(id) ON DELETE RESTRICT,
  finance_category finance_category NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX asset_categories_industry_name_uq ON asset_categories(industry_id, name);
CREATE INDEX asset_categories_industry_idx ON asset_categories(industry_id);

CREATE TABLE asset_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES asset_categories(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX asset_types_category_name_uq ON asset_types(category_id, name);
CREATE INDEX asset_types_category_idx ON asset_types(category_id);

ALTER TABLE finance_applications
  ADD COLUMN asset_type_id uuid REFERENCES asset_types(id) ON DELETE SET NULL,
  ADD COLUMN industry_name_snapshot text,
  ADD COLUMN asset_category_name_snapshot text,
  ADD COLUMN asset_type_name_snapshot text;

ALTER TABLE finance_drafts
  ADD COLUMN asset_type_id uuid REFERENCES asset_types(id) ON DELETE SET NULL,
  ADD COLUMN industry_name_snapshot text,
  ADD COLUMN asset_category_name_snapshot text,
  ADD COLUMN asset_type_name_snapshot text;

CREATE INDEX finance_applications_asset_type_idx ON finance_applications(asset_type_id);
