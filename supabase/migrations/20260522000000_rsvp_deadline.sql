-- Add RSVP deadline to events
ALTER TABLE events ADD COLUMN IF NOT EXISTS rsvp_deadline TEXT;
