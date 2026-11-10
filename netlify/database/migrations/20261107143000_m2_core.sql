-- M2 core identity, role and permission schema.
CREATE TYPE account_type AS ENUM ('office','customer','partner','service');
CREATE TYPE account_status AS ENUM ('invited','active','disabled');
CREATE TYPE applicant_type AS ENUM ('individual','business');
CREATE TYPE finance_category AS ENUM ('vehicle','equipment','commercial-asset','other');
CREATE TYPE application_status AS ENUM ('Draft','Submitted','Under review','Awaiting documents','With finance provider','Provider decision received','Closed');
CREATE TYPE priority AS ENUM ('High','Medium','Low');
CREATE TYPE document_status AS ENUM ('Outstanding','Received','Verified','Rejected');
CREATE TYPE partner_status AS ENUM ('Pending approval','Approved','Suspended','Declined');
CREATE TYPE support_channel AS ENUM ('Contact form','Support','Complaint','Partner enquiry');
CREATE TYPE support_status AS ENUM ('Open','Awaiting customer','Resolved');
CREATE TYPE consent_type AS ENUM ('accuracy','processing','share_providers','credit_check','marketing');

CREATE TABLE users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), identity_id text NOT NULL,
 email text NOT NULL, display_name text, account_type account_type NOT NULL,
 status account_status NOT NULL DEFAULT 'invited', last_login_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_identity_id_uq ON users(identity_id);
CREATE UNIQUE INDEX users_email_uq ON users(email);
CREATE INDEX users_account_type_status_idx ON users(account_type,status);

CREATE TABLE roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL, name text NOT NULL,
 description text NOT NULL DEFAULT '', audience account_type NOT NULL,
 is_system boolean NOT NULL DEFAULT false, is_reserved boolean NOT NULL DEFAULT false,
 is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX roles_key_uq ON roles(key);
CREATE TABLE permissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL, resource text NOT NULL,
 action text NOT NULL, scope text NOT NULL, label text NOT NULL, account_types jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX permissions_key_uq ON permissions(key);
CREATE INDEX permissions_resource_action_idx ON permissions(resource,action);
CREATE TABLE role_permissions (
 role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
 permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX role_permissions_role_permission_uq ON role_permissions(role_id,permission_id);
CREATE TABLE staff_roles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role_id uuid NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
 assigned_by uuid REFERENCES users(id) ON DELETE SET NULL, assigned_at timestamptz NOT NULL DEFAULT now(),
 revoked_at timestamptz
);
CREATE UNIQUE INDEX staff_roles_active_uq ON staff_roles(user_id,role_id) WHERE revoked_at IS NULL;
CREATE TABLE user_permission_overrides (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
 effect text NOT NULL CHECK(effect IN ('grant','deny')), reason text,
 granted_by uuid REFERENCES users(id) ON DELETE SET NULL, expires_at timestamptz, revoked_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_permission_overrides_user_idx ON user_permission_overrides(user_id);
CREATE INDEX user_permission_overrides_expiry_idx ON user_permission_overrides(expires_at);
CREATE TABLE user_suspensions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 reason text NOT NULL, suspended_by uuid REFERENCES users(id) ON DELETE SET NULL,
 suspended_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz,
 lifted_by uuid REFERENCES users(id) ON DELETE SET NULL, lifted_at timestamptz
);
CREATE INDEX user_suspensions_user_active_idx ON user_suspensions(user_id,lifted_at);
CREATE TABLE permission_audit_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
 affected_user_id uuid REFERENCES users(id) ON DELETE SET NULL, action text NOT NULL, resource text NOT NULL,
 record_id text, previous_value jsonb, new_value jsonb, reason text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX permission_audit_log_actor_idx ON permission_audit_log(actor_user_id);
CREATE INDEX permission_audit_log_affected_idx ON permission_audit_log(affected_user_id);
CREATE INDEX permission_audit_log_created_idx ON permission_audit_log(created_at);
CREATE FUNCTION reject_permission_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'permission_audit_log is append-only; % is prohibited', TG_OP; END;
$$;
CREATE TRIGGER permission_audit_log_no_update BEFORE UPDATE ON permission_audit_log
 FOR EACH ROW EXECUTE FUNCTION reject_permission_audit_mutation();
CREATE TRIGGER permission_audit_log_no_delete BEFORE DELETE ON permission_audit_log
 FOR EACH ROW EXECUTE FUNCTION reject_permission_audit_mutation();
CREATE TRIGGER permission_audit_log_no_truncate BEFORE TRUNCATE ON permission_audit_log
 FOR EACH STATEMENT EXECUTE FUNCTION reject_permission_audit_mutation();

CREATE TABLE customers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
 applicant_type applicant_type NOT NULL, first_name text, last_name text, business_name text, phone text,
 profile jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX customers_user_id_uq ON customers(user_id);
CREATE INDEX customers_name_idx ON customers(last_name,first_name);
CREATE TABLE finance_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category finance_category NOT NULL, name text NOT NULL,
 description text NOT NULL DEFAULT '', document_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
 is_active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX finance_products_category_uq ON finance_products(category);
