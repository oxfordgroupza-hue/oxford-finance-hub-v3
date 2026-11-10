-- Approved partners may also be applicants in their own right.
-- These permissions remain strictly scoped to the signed-in user's own records.
UPDATE permissions
SET account_types = '["customer","partner"]'::jsonb
WHERE key IN (
  'own_applications.view',
  'own_applications.create',
  'own_applications.edit',
  'own_documents.view',
  'own_documents.create',
  'own_documents.download'
);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.key = 'partner'
  AND r.is_system = true
  AND p.key IN (
    'own_applications.view',
    'own_applications.create',
    'own_applications.edit',
    'own_documents.view',
    'own_documents.create',
    'own_documents.download'
  )
ON CONFLICT DO NOTHING;

UPDATE roles
SET description = 'Self-service access to the partner’s own applications, documents, referrals, profile and support requests.',
    updated_at = now()
WHERE key = 'partner' AND is_system = true;
