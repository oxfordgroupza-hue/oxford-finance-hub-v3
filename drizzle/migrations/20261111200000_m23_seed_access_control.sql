-- Idempotently install the built-in access-control catalogue before M23 validates the reserved role.
-- Generated from src/lib/access-control.ts; keep this catalogue in sync with roleTemplates.
INSERT INTO permissions (key, resource, action, scope, label, account_types)
VALUES
('applications.view', 'applications', 'view', 'office', 'View applications', '["office","service"]'::jsonb),
('applications.create', 'applications', 'create', 'office', 'Create applications', '["office","service"]'::jsonb),
('applications.edit', 'applications', 'edit', 'office', 'Edit applications', '["office","service"]'::jsonb),
('applications.delete', 'applications', 'delete', 'office', 'Delete applications', '["office"]'::jsonb),
('applications.approve', 'applications', 'approve', 'office', 'Approve applications', '["office"]'::jsonb),
('applications.assign', 'applications', 'assign', 'office', 'Assign applications', '["office"]'::jsonb),
('applications.export', 'applications', 'export', 'office', 'Export applications', '["office","service"]'::jsonb),
('documents.view', 'documents', 'view', 'office', 'View application documents', '["office","service"]'::jsonb),
('documents.create', 'documents', 'create', 'office', 'Create application documents', '["office","service"]'::jsonb),
('documents.edit', 'documents', 'edit', 'office', 'Edit application documents', '["office","service"]'::jsonb),
('documents.delete', 'documents', 'delete', 'office', 'Delete application documents', '["office"]'::jsonb),
('documents.approve', 'documents', 'approve', 'office', 'Approve application documents', '["office"]'::jsonb),
('documents.download', 'documents', 'download', 'office', 'Download application documents', '["office","service"]'::jsonb),
('pdf_packs.view', 'pdf_packs', 'view', 'office', 'View pdf application packs', '["office","service"]'::jsonb),
('pdf_packs.create', 'pdf_packs', 'create', 'office', 'Create pdf application packs', '["office","service"]'::jsonb),
('pdf_packs.download', 'pdf_packs', 'download', 'office', 'Download pdf application packs', '["office","service"]'::jsonb),
('notes.view', 'notes', 'view', 'office', 'View internal notes', '["office","service"]'::jsonb),
('notes.create', 'notes', 'create', 'office', 'Create internal notes', '["office","service"]'::jsonb),
('notes.edit', 'notes', 'edit', 'office', 'Edit internal notes', '["office","service"]'::jsonb),
('notes.delete', 'notes', 'delete', 'office', 'Delete internal notes', '["office"]'::jsonb),
('customers.view', 'customers', 'view', 'office', 'View customers', '["office","service"]'::jsonb),
('customers.create', 'customers', 'create', 'office', 'Create customers', '["office","service"]'::jsonb),
('customers.edit', 'customers', 'edit', 'office', 'Edit customers', '["office","service"]'::jsonb),
('customers.delete', 'customers', 'delete', 'office', 'Delete customers', '["office"]'::jsonb),
('customers.export', 'customers', 'export', 'office', 'Export customers', '["office","service"]'::jsonb),
('directory.view', 'directory', 'view', 'office', 'View restricted people directory', '["office","service"]'::jsonb),
('identity_records.view', 'identity_records', 'view', 'office', 'View sensitive identity numbers', '["office","service"]'::jsonb),
('partners.view', 'partners', 'view', 'office', 'View partners', '["office","service"]'::jsonb),
('partners.create', 'partners', 'create', 'office', 'Create partners', '["office","service"]'::jsonb),
('partners.edit', 'partners', 'edit', 'office', 'Edit partners', '["office","service"]'::jsonb),
('partners.delete', 'partners', 'delete', 'office', 'Delete partners', '["office"]'::jsonb),
('partners.approve', 'partners', 'approve', 'office', 'Approve partners', '["office"]'::jsonb),
('partners.export', 'partners', 'export', 'office', 'Export partners', '["office","service"]'::jsonb),
('support.view', 'support', 'view', 'office', 'View support inbox', '["office","service"]'::jsonb),
('support.create', 'support', 'create', 'office', 'Create support inbox', '["office","service"]'::jsonb),
('support.edit', 'support', 'edit', 'office', 'Edit support inbox', '["office","service"]'::jsonb),
('support.delete', 'support', 'delete', 'office', 'Delete support inbox', '["office"]'::jsonb),
('support.assign', 'support', 'assign', 'office', 'Assign support inbox', '["office"]'::jsonb),
('products.view', 'products', 'view', 'office', 'View finance products', '["office","service"]'::jsonb),
('products.create', 'products', 'create', 'office', 'Create finance products', '["office","service"]'::jsonb),
('products.edit', 'products', 'edit', 'office', 'Edit finance products', '["office","service"]'::jsonb),
('products.delete', 'products', 'delete', 'office', 'Delete finance products', '["office"]'::jsonb),
('products.manage', 'products', 'manage', 'office', 'Manage finance products', '["office"]'::jsonb),
('content.view', 'content', 'view', 'office', 'View site content', '["office","service"]'::jsonb),
('content.create', 'content', 'create', 'office', 'Create site content', '["office","service"]'::jsonb),
('content.edit', 'content', 'edit', 'office', 'Edit site content', '["office","service"]'::jsonb),
('content.delete', 'content', 'delete', 'office', 'Delete site content', '["office"]'::jsonb),
('content.approve', 'content', 'approve', 'office', 'Approve site content', '["office"]'::jsonb),
('reports.view', 'reports', 'view', 'office', 'View reports', '["office","service"]'::jsonb),
('reports.export', 'reports', 'export', 'office', 'Export reports', '["office","service"]'::jsonb),
('audit_log.view', 'audit_log', 'view', 'office', 'View audit log', '["office"]'::jsonb),
('audit_log.export', 'audit_log', 'export', 'office', 'Export audit log', '["office"]'::jsonb),
('integrations.view', 'integrations', 'view', 'office', 'View integrations', '["office","service"]'::jsonb),
('integrations.edit', 'integrations', 'edit', 'office', 'Edit integrations', '["office","service"]'::jsonb),
('integrations.manage', 'integrations', 'manage', 'office', 'Manage integrations', '["office"]'::jsonb),
('notifications.view', 'notifications', 'view', 'office', 'View notifications', '["office","service"]'::jsonb),
('notifications.create', 'notifications', 'create', 'office', 'Create notifications', '["office","service"]'::jsonb),
('notifications.manage', 'notifications', 'manage', 'office', 'Manage notifications', '["office"]'::jsonb),
('users.view', 'users', 'view', 'office', 'View users', '["office"]'::jsonb),
('users.create', 'users', 'create', 'office', 'Create users', '["office"]'::jsonb),
('users.edit', 'users', 'edit', 'office', 'Edit users', '["office"]'::jsonb),
('users.manage', 'users', 'manage', 'office', 'Manage users', '["office"]'::jsonb),
('roles.view', 'roles', 'view', 'office', 'View roles', '["office"]'::jsonb),
('roles.create', 'roles', 'create', 'office', 'Create roles', '["office"]'::jsonb),
('roles.edit', 'roles', 'edit', 'office', 'Edit roles', '["office"]'::jsonb),
('roles.assign', 'roles', 'assign', 'office', 'Assign roles', '["office"]'::jsonb),
('roles.manage', 'roles', 'manage', 'office', 'Manage roles', '["office"]'::jsonb),
('office.view', 'office', 'view', 'office', 'View office workspace', '["office"]'::jsonb),
('office.manage', 'office', 'manage', 'office', 'Manage office workspace', '["office"]'::jsonb),
('settlements.view', 'settlements', 'view', 'office', 'View settlements', '["office","service"]'::jsonb),
('settlements.create', 'settlements', 'create', 'office', 'Create settlements', '["office","service"]'::jsonb),
('settlements.approve', 'settlements', 'approve', 'office', 'Approve settlements', '["office"]'::jsonb),
('credit_assessments.view', 'credit_assessments', 'view', 'office', 'View credit assessments', '["office","service"]'::jsonb),
('credit_assessments.create', 'credit_assessments', 'create', 'office', 'Create credit assessments', '["office","service"]'::jsonb),
('credit_assessments.edit', 'credit_assessments', 'edit', 'office', 'Edit credit assessments', '["office","service"]'::jsonb),
('credit_assessments.export', 'credit_assessments', 'export', 'office', 'Export credit assessments', '["office","service"]'::jsonb),
('own_applications.view', 'own_applications', 'view', 'self_service', 'View my applications', '["customer"]'::jsonb),
('own_applications.create', 'own_applications', 'create', 'self_service', 'Create my applications', '["customer"]'::jsonb),
('own_applications.edit', 'own_applications', 'edit', 'self_service', 'Edit my applications', '["customer"]'::jsonb),
('own_documents.view', 'own_documents', 'view', 'self_service', 'View my documents', '["customer"]'::jsonb),
('own_documents.create', 'own_documents', 'create', 'self_service', 'Create my documents', '["customer"]'::jsonb),
('own_documents.download', 'own_documents', 'download', 'self_service', 'Download my documents', '["customer"]'::jsonb),
('own_profile.view', 'own_profile', 'view', 'self_service', 'View my profile', '["customer","partner"]'::jsonb),
('own_profile.edit', 'own_profile', 'edit', 'self_service', 'Edit my profile', '["customer","partner"]'::jsonb),
('own_support.view', 'own_support', 'view', 'self_service', 'View my support requests', '["customer","partner"]'::jsonb),
('own_support.create', 'own_support', 'create', 'self_service', 'Create my support requests', '["customer","partner"]'::jsonb),
('partner_referrals.view', 'partner_referrals', 'view', 'self_service', 'View my referrals', '["partner"]'::jsonb),
('partner_referrals.create', 'partner_referrals', 'create', 'self_service', 'Create my referrals', '["partner"]'::jsonb),
('partner_referrals.export', 'partner_referrals', 'export', 'self_service', 'Export my referrals', '["partner"]'::jsonb),
('own_payouts.view', 'own_payouts', 'view', 'self_service', 'View my partner payouts', '["partner"]'::jsonb)
ON CONFLICT (key) DO UPDATE SET
  resource = EXCLUDED.resource,
  action = EXCLUDED.action,
  scope = EXCLUDED.scope,
  label = EXCLUDED.label,
  account_types = EXCLUDED.account_types;

INSERT INTO roles (key, name, description, audience, is_system, is_reserved, is_active)
VALUES
('super_administrator', 'Super Administrator', 'Reserved. Holds every office permission and is the only role that can manage other Super Administrators.', 'office', true, true, true),
('administrator', 'Administrator', 'Runs the office: users, roles, partners, products and content. Cannot change security-sensitive workspace settings or Super Administrators.', 'office', true, false, true),
('office_staff', 'Office staff', 'Processes applications end to end, including assignment and documents.', 'office', true, false, true),
('application_reviewer', 'Application reviewer', 'Reviews assigned applications, verifies documents and records provider outcomes. Cannot assign work.', 'office', true, false, true),
('customer_support', 'Customer support', 'Handles support requests and customer communication, with access to a restricted contact directory. Financial information, private documents and full identity numbers are excluded.', 'office', true, false, true),
('customer', 'Customer', 'Self-service access to the customer’s own applications, documents, profile and support requests.', 'customer', true, false, true),
('partner', 'Partner', 'Self-service access to the partner’s own referrals, profile and support requests.', 'partner', true, false, true)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  audience = EXCLUDED.audience,
  is_system = true,
  is_reserved = EXCLUDED.is_reserved,
  is_active = CASE WHEN roles.key = 'super_administrator' THEN true ELSE roles.is_active END,
  updated_at = now();

-- System-role grants are template-managed; Super Administrator grants are resolved by the authorization engine.
DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE is_system = true);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN ('applications.view', 'applications.create', 'applications.edit', 'applications.delete', 'applications.approve', 'applications.assign', 'applications.export', 'documents.view', 'documents.create', 'documents.edit', 'documents.delete', 'documents.approve', 'documents.download', 'pdf_packs.view', 'pdf_packs.create', 'pdf_packs.download', 'notes.view', 'notes.create', 'notes.edit', 'notes.delete', 'customers.view', 'customers.create', 'customers.edit', 'customers.delete', 'customers.export', 'directory.view', 'identity_records.view', 'partners.view', 'partners.create', 'partners.edit', 'partners.delete', 'partners.approve', 'partners.export', 'support.view', 'support.create', 'support.edit', 'support.delete', 'support.assign', 'products.view', 'products.create', 'products.edit', 'products.delete', 'products.manage', 'content.view', 'content.create', 'content.edit', 'content.delete', 'content.approve', 'reports.view', 'reports.export', 'audit_log.view', 'audit_log.export', 'integrations.view', 'integrations.edit', 'integrations.manage', 'notifications.view', 'notifications.create', 'notifications.manage', 'users.view', 'users.create', 'users.edit', 'users.manage', 'roles.view', 'roles.create', 'roles.edit', 'roles.assign', 'roles.manage', 'office.view', 'settlements.view', 'settlements.create', 'settlements.approve', 'credit_assessments.view', 'credit_assessments.create', 'credit_assessments.edit', 'credit_assessments.export')
WHERE r.key = 'administrator'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN ('office.view', 'directory.view', 'applications.view', 'applications.create', 'applications.edit', 'applications.assign', 'documents.view', 'documents.create', 'documents.download', 'pdf_packs.view', 'pdf_packs.create', 'pdf_packs.download', 'notes.view', 'notes.create', 'notes.edit', 'customers.view', 'customers.create', 'customers.edit', 'identity_records.view', 'partners.view', 'support.view', 'support.create', 'support.edit', 'support.assign', 'products.view', 'content.view', 'reports.view', 'notifications.view', 'notifications.create')
WHERE r.key = 'office_staff'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN ('office.view', 'directory.view', 'applications.view', 'applications.edit', 'applications.approve', 'credit_assessments.view', 'credit_assessments.create', 'credit_assessments.edit', 'documents.view', 'documents.download', 'documents.approve', 'pdf_packs.view', 'pdf_packs.download', 'notes.view', 'notes.create', 'notes.edit', 'customers.view', 'reports.view', 'identity_records.view')
WHERE r.key = 'application_reviewer'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN ('office.view', 'support.view', 'support.create', 'support.edit', 'support.assign', 'directory.view', 'notifications.view')
WHERE r.key = 'customer_support'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN ('own_applications.view', 'own_applications.create', 'own_applications.edit', 'own_documents.view', 'own_documents.create', 'own_documents.download', 'own_profile.view', 'own_profile.edit', 'own_support.view', 'own_support.create')
WHERE r.key = 'customer'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.key IN ('partner_referrals.view', 'partner_referrals.create', 'partner_referrals.export', 'own_payouts.view', 'own_profile.view', 'own_profile.edit', 'own_support.view', 'own_support.create')
WHERE r.key = 'partner'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- This migration creates role definitions only. It never creates users or assigns Super Administrator.
