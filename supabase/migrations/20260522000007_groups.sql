-- Gruppi: raccolgono più eventi sotto una chiave di accesso comune
CREATE TABLE IF NOT EXISTS event_groups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  type        TEXT        NOT NULL DEFAULT 'altro'
                          CHECK (type IN ('corso','progetto','compagnia','altro')),
  access_key  TEXT        NOT NULL,
  slug        TEXT        UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Collegamento opzionale evento → gruppo
ALTER TABLE events ADD COLUMN IF NOT EXISTS group_id UUID
  REFERENCES event_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_events_group_id ON events(group_id);
