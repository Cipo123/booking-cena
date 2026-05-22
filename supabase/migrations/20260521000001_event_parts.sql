-- Event parts: support for multi-stage events (aperitivo + cena + dopocena)

CREATE TABLE IF NOT EXISTS event_parts (
  id          TEXT PRIMARY KEY,
  event_id    TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'cena',
  description TEXT NOT NULL DEFAULT '',
  location    TEXT NOT NULL DEFAULT '',
  time        TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_event_parts_event_id ON event_parts(event_id);

-- Add part_id to availabilities (NULL = event-level, NOT NULL = part-level)
ALTER TABLE availabilities ADD COLUMN IF NOT EXISTS part_id TEXT REFERENCES event_parts(id) ON DELETE CASCADE;

-- Drop old unique constraint, replace with one that handles NULL part_id
ALTER TABLE availabilities DROP CONSTRAINT IF EXISTS availabilities_event_id_user_name_key;
ALTER TABLE availabilities ADD CONSTRAINT IF NOT EXISTS availabilities_unique_v2
  UNIQUE NULLS NOT DISTINCT (event_id, user_name, part_id);
