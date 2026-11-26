-- M10: Super Admin-controlled permission for partners to upload supporting documents.
-- Disabled by default for all existing and newly registered partners.
ALTER TABLE partner_registrations
  ADD COLUMN can_upload_supporting_documents boolean NOT NULL DEFAULT false;
