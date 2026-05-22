-- Doodle-style date polls
CREATE TABLE IF NOT EXISTS date_polls (
  id          TEXT        PRIMARY KEY,
  title       TEXT        NOT NULL,
  description TEXT        DEFAULT '',
  closed      BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS date_poll_options (
  id          TEXT        PRIMARY KEY,
  poll_id     TEXT        NOT NULL REFERENCES date_polls(id) ON DELETE CASCADE,
  label       TEXT        NOT NULL,
  date        TEXT        NOT NULL,
  time        TEXT        NOT NULL,
  order_index INTEGER     DEFAULT 0
);
CREATE INDEX IF NOT EXISTS poll_options_poll_idx ON date_poll_options(poll_id);

CREATE TABLE IF NOT EXISTS date_poll_votes (
  id          TEXT        PRIMARY KEY,
  option_id   TEXT        NOT NULL REFERENCES date_poll_options(id) ON DELETE CASCADE,
  user_name   TEXT        NOT NULL,
  user_email  TEXT        DEFAULT '',
  status      TEXT        NOT NULL CHECK (status IN ('yes','maybe','no')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(option_id, user_name)
);
CREATE INDEX IF NOT EXISTS poll_votes_option_idx ON date_poll_votes(option_id);
