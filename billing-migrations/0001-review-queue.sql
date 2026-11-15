-- Isolated Popz Bowling Stripe billing-review queue. PREVIEW D1 ONLY.
-- This is metadata/audit, not customer bowling scores or card information.
CREATE TABLE IF NOT EXISTS billing_reviews (
  id TEXT PRIMARY KEY NOT NULL,
  uid TEXT NOT NULL,
  kind TEXT NOT NULL,
  provider_status TEXT NOT NULL,
  reference_id TEXT NOT NULL,
  payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0 AND amount_cents <= 999),
  review_state TEXT NOT NULL DEFAULT 'manual_review_required'
    CHECK (review_state IN ('manual_review_required', 'acknowledged', 'resolved')),
  alert_state TEXT NOT NULL DEFAULT 'pending'
    CHECK (alert_state IN ('pending', 'notified')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  notified_at TEXT,
  acknowledged_at TEXT,
  resolved_at TEXT,
  reviewer_note TEXT,
  reviewed_by TEXT
);
CREATE INDEX IF NOT EXISTS billing_reviews_alerts
  ON billing_reviews(alert_state, created_at);
CREATE INDEX IF NOT EXISTS billing_reviews_open
  ON billing_reviews(review_state, created_at);
