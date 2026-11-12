-- Initial Super Administrator provisioning is deferred until a real Netlify
-- Identity session proves control of the designated email address.
--
-- A SQL migration runs before the application can be published and cannot
-- query the Netlify Identity user directory. Requiring an application users
-- row here creates a first-deploy deadlock: the row is normally created by the
-- Identity signup/login hook, which cannot run until this migration succeeds.
--
-- Keep the reserved role invariant checked at migration time. The first
-- confirmed sign-in performs the one-time promotion in server-side auth code,
-- gated by OXFORD_INITIAL_SUPER_ADMIN_EMAIL, the production context, confirmed
-- Identity email, account status, suspension state, no prior assignment history, and the
-- absence of another active Super Administrator. The promotion is audited.
DO $$
DECLARE
  super_role RECORD;
BEGIN
  SELECT id, key, audience, is_reserved, is_active
    INTO super_role
    FROM roles
   WHERE key = 'super_administrator'
   FOR UPDATE;

  IF NOT FOUND
     OR super_role.audience <> 'office'
     OR NOT super_role.is_reserved
     OR NOT super_role.is_active THEN
    RAISE EXCEPTION 'Initial Super Administrator provisioning deferred: reserved Super Administrator role is missing or invalid.';
  END IF;
END $$;
