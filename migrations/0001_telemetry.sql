CREATE TABLE IF NOT EXISTS telemetry_events (
 id TEXT PRIMARY KEY,
 device_id TEXT NOT NULL,
 event TEXT NOT NULL,
 app_version TEXT NOT NULL,
 occurred_at TEXT NOT NULL,
 received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 install_mode TEXT NOT NULL CHECK (install_mode IN ('browser','installed')),
 platform TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON telemetry_events(device_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_event_time ON telemetry_events(event, occurred_at);
