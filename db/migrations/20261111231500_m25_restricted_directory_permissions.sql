-- M25: Add restricted directory and sensitive identity permissions without resetting customised roles.
-- Only the named system roles receive these grants. Existing custom roles and user overrides are preserved.
INSERT INTO permissions (key, resource, action, scope, label, account_types, created_at)
VALUES
  ('directory.view', 'directory', 'view', 'office', 'View restricted people directory', '["office","service"]'::jsonb, now()),
  ('identity_records.view', 'identity_records', 'view', 'office', 'View full applicant ID/passport numbers', '["office","service"]'::jsonb, now())
ON CONFLICT (key) DO UPDATE SET
  resource = EXCLUDED.resource,
  action = EXCLUDED.action,
  scope = EXCLUDED.scope,
  label = EXCLUDED.label,
  account_types = EXCLUDED.account_types;

-- Support receives contact-only directory search, not sensitive identity-number access.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.key = 'directory.view'
 WHERE r.key IN ('customer_support', 'office_staff', 'application_reviewer', 'administrator')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Full identity-number visibility is deliberately separate and limited to office processing roles.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
  FROM roles r
  JOIN permissions p ON p.key = 'identity_records.view'
 WHERE r.key IN ('office_staff', 'application_reviewer', 'administrator')
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO permission_audit_log
  (actor_user_id, affected_user_id, action, resource, reason, created_at)
VALUES
  (NULL, NULL, 'directory_permissions_migrated', 'permissions',
   'Added restricted directory and separately controlled identity-number permissions without replacing existing role grants.', now());
