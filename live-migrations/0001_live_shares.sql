-- Independent LIVE_SHARE_DB only. Never apply to TELEMETRY_DB.
CREATE TABLE IF NOT EXISTS live_shares (
  token TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('active','final','stopped')),
  snapshot TEXT,
  revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS live_shares_expiry ON live_shares(expires_at);
CREATE TABLE IF NOT EXISTS live_create_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
