-- M26: Persist the optional phone number already collected by the public enquiry form.
-- This allows the restricted directory to locate unlinked Support enquiries by phone.
ALTER TABLE support_requests ADD COLUMN IF NOT EXISTS phone text;
CREATE INDEX IF NOT EXISTS support_requests_phone_idx
  ON support_requests (phone);
