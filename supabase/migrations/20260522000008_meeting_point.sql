-- Punto di ritrovo: luogo di partenza comune prima di raggiungere l'evento
ALTER TABLE events ADD COLUMN IF NOT EXISTS meeting_point TEXT NOT NULL DEFAULT '';
