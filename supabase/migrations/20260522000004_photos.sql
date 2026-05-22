-- Event photo wall
CREATE TABLE IF NOT EXISTS event_photos (
  id             TEXT        PRIMARY KEY,
  event_id       TEXT        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  url            TEXT        NOT NULL,
  uploader_name  TEXT        NOT NULL DEFAULT '',
  created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS event_photos_event_idx ON event_photos(event_id);
