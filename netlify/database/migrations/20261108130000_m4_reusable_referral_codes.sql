-- A partner's referral code is reusable; each referred application is a separate referral event.
DROP INDEX IF EXISTS referrals_code_uq;
CREATE INDEX IF NOT EXISTS referrals_code_idx ON referrals (code);
