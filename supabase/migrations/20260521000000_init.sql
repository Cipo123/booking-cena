-- BookingCena: schema iniziale

CREATE TABLE IF NOT EXISTS events (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  type             TEXT NOT NULL DEFAULT 'cena',
  location         TEXT NOT NULL DEFAULT '',
  date             TEXT NOT NULL,
  time             TEXT NOT NULL,
  max_participants INTEGER,
  created_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS availabilities (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_name   TEXT NOT NULL,
  user_email  TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL,
  note        TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL,
  UNIQUE(event_id, user_name),
  CONSTRAINT status_check CHECK (status IN ('yes', 'maybe', 'no'))
);

CREATE INDEX IF NOT EXISTS idx_availabilities_event_id ON availabilities(event_id);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date, time);
