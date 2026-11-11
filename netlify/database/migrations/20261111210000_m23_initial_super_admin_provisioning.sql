-- One-time, auditable initial Oxford Super Administrator provisioning.
-- This migration runs against the isolated Deploy Preview database first.
-- It deliberately fails closed if the designated verified account, reserved role,
-- or first-administrator conditions do not match the expected state.
DO $$
DECLARE
  target_user RECORD;
  super_role RECORD;
  customer_role RECORD;
BEGIN
  SELECT id, email, account_type, status
    INTO target_user
    FROM users
   WHERE lower(email) = 'oxfordbusinessgroup@outlook.com'
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Initial Super Administrator provisioning stopped: designated Oxford account was not found.';
  END IF;

  IF target_user.status <> 'active' THEN
    RAISE EXCEPTION 'Initial Super Administrator provisioning stopped: designated account is not active.';
  END IF;

  IF target_user.account_type NOT IN ('customer', 'office') THEN
    RAISE EXCEPTION 'Initial Super Administrator provisioning stopped: designated account has an unexpected account type.';
  END IF;

  SELECT id, key, audience, is_reserved, is_active
    INTO super_role
    FROM roles
   WHERE key = 'super_administrator'
   FOR UPDATE;

  IF NOT FOUND OR super_role.audience <> 'office' OR NOT super_role.is_reserved OR NOT super_role.is_active THEN
    RAISE EXCEPTION 'Initial Super Administrator provisioning stopped: reserved Super Administrator role is missing or invalid.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM staff_roles
     WHERE user_id = target_user.id AND role_id = super_role.id
  ) THEN
    RAISE EXCEPTION 'Initial Super Administrator provisioning stopped: this account already has Super Administrator assignment history.';
  END IF;

  IF EXISTS (
    SELECT 1
      FROM staff_roles sr
      JOIN roles r ON r.id = sr.role_id
     WHERE r.key = 'super_administrator'
       AND sr.revoked_at IS NULL
       AND sr.user_id <> target_user.id
  ) THEN
    RAISE EXCEPTION 'Initial Super Administrator provisioning stopped: another active Super Administrator already exists.';
  END IF;

  SELECT id INTO customer_role FROM roles WHERE key = 'customer';

  UPDATE users
     SET account_type = 'office', status = 'active', updated_at = now()
   WHERE id = target_user.id;

  IF FOUND AND customer_role.id IS NOT NULL THEN
    UPDATE staff_roles
       SET revoked_at = now()
     WHERE user_id = target_user.id
       AND role_id = customer_role.id
       AND revoked_at IS NULL;
  END IF;

  INSERT INTO staff_roles (user_id, role_id, assigned_by, assigned_at)
  VALUES (target_user.id, super_role.id, NULL, now());

  INSERT INTO permission_audit_log
    (actor_user_id, affected_user_id, action, resource, record_id, previous_value, new_value, reason, created_at)
  VALUES
    (NULL, target_user.id, 'bootstrap_super_admin', 'users', target_user.id::text,
     jsonb_build_object('accountType', target_user.account_type, 'status', target_user.status),
     jsonb_build_object('accountType', 'office', 'status', 'active', 'roleKey', 'super_administrator'),
     'Controlled one-time initial Super Administrator provisioning on the approved V3 Deploy Preview after the designated account completed email verification.', now());

  INSERT INTO audit_events
    (actor_user_id, event, resource, resource_id, details, created_at)
  VALUES
    (NULL, 'user.super_admin_provisioned', 'user', target_user.id::text,
     jsonb_build_object('roleKey', 'super_administrator', 'method', 'controlled_one_time_preview_provisioning', 'email', target_user.email), now());
END $$;
