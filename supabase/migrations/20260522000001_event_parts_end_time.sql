-- Add end_time to event_parts (optional end time per stage)
ALTER TABLE event_parts ADD COLUMN IF NOT EXISTS end_time TEXT NOT NULL DEFAULT '';
