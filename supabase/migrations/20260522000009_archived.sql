-- Add archived flag to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE NOT NULL;
