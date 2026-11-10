-- Tighten the built-in Customer Support role to the support workspace only.
-- Existing role_permissions rows are persistent, so remove permissions that were
-- previously seeded by the broader template. Custom roles and user overrides are untouched.

DELETE FROM role_permissions rp
USING roles r, permissions p
WHERE rp.role_id = r.id
  AND rp.permission_id = p.id
  AND r.key = 'customer_support'
  AND r.is_system = true
  AND p.key IN (
    'applications.view',
    'customers.view',
    'customers.edit',
    'partners.view',
    'notes.view',
    'notes.create'
  );

UPDATE roles
SET description = 'Handles support requests and customer communication. Application, partner, internal-note and document registers are not included.',
    updated_at = now()
WHERE key = 'customer_support'
  AND is_system = true;

