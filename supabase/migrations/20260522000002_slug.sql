-- Slug vanity URL for events
ALTER TABLE events ADD COLUMN IF NOT EXISTS slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS events_slug_idx ON events(slug);
