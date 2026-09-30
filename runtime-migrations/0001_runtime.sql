CREATE TABLE IF NOT EXISTS runtime_events (
 id TEXT PRIMARY KEY,
 runtime_id TEXT NOT NULL,
 boot_id TEXT NOT NULL,
 event TEXT NOT NULL,
 app_version TEXT NOT NULL,
 occurred_at TEXT NOT NULL,
 received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 install_mode TEXT NOT NULL CHECK (install_mode IN ('browser','installed')),
 platform TEXT NOT NULL,
 error_kind TEXT NOT NULL DEFAULT '',
 error_message TEXT NOT NULL DEFAULT '',
 source TEXT NOT NULL DEFAULT '',
 line INTEGER NOT NULL DEFAULT 0,
 col INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_runtime_time ON runtime_events(occurred_at);
CREATE INDEX IF NOT EXISTS idx_runtime_boot ON runtime_events(boot_id,event);
CREATE INDEX IF NOT EXISTS idx_runtime_event_time ON runtime_events(event,occurred_at);
