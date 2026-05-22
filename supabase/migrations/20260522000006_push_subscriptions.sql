-- Web push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          TEXT        PRIMARY KEY,
  event_id    TEXT        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  endpoint    TEXT        NOT NULL,
  p256dh      TEXT        NOT NULL,
  auth_key    TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(event_id, endpoint)
);
CREATE INDEX IF NOT EXISTS push_subs_event_idx ON push_subscriptions(event_id);
