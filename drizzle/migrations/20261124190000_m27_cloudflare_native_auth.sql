-- M27: Additive Cloudflare-native authentication storage.
-- Existing legacy identity mappings are retained; new Cloudflare accounts may have no legacy identity_id.
BEGIN;
ALTER TABLE users ALTER COLUMN identity_id DROP NOT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

CREATE TABLE IF NOT EXISTS auth_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  password_salt text NOT NULL,
  password_algorithm text NOT NULL DEFAULT 'pbkdf2-sha256' CHECK (password_algorithm = 'pbkdf2-sha256'),
  password_iterations integer NOT NULL CHECK (password_iterations >= 100000),
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user_active_idx
  ON auth_sessions (user_id, expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS auth_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('email_verification', 'password_recovery', 'account_invitation')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_challenges_user_purpose_idx
  ON auth_challenges (user_id, purpose, expires_at);
COMMIT;
