-- Event comments / bacheca
CREATE TABLE IF NOT EXISTS event_comments (
  id          TEXT        PRIMARY KEY,
  event_id    TEXT        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_name   TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_comments_event_idx ON event_comments(event_id);
