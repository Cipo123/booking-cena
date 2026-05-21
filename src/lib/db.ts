import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'booking.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initDb(db);
  }
  return db;
}

function initDb(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      type TEXT NOT NULL DEFAULT 'cena',
      location TEXT DEFAULT '',
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      max_participants INTEGER,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS availabilities (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT DEFAULT '',
      status TEXT NOT NULL CHECK(status IN ('yes','maybe','no')),
      note TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE(event_id, user_name)
    );
  `);
}

export type EventType = 'cena' | 'aperitivo' | 'colazione' | 'pizza' | 'festa' | 'altro';

export interface Event {
  id: string;
  title: string;
  description: string;
  type: EventType;
  location: string;
  date: string;
  time: string;
  max_participants: number | null;
  created_at: string;
}

export interface Availability {
  id: string;
  event_id: string;
  user_name: string;
  user_email: string;
  status: 'yes' | 'maybe' | 'no';
  note: string;
  created_at: string;
}

export interface EventWithAvailabilities extends Event {
  availabilities: Availability[];
}

export const eventsDb = {
  getAll(): Event[] {
    return getDb()
      .prepare('SELECT * FROM events ORDER BY date ASC, time ASC')
      .all() as Event[];
  },

  getById(id: string): Event | null {
    return (
      (getDb().prepare('SELECT * FROM events WHERE id = ?').get(id) as Event) ?? null
    );
  },

  create(data: Omit<Event, 'id' | 'created_at'>): Event {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO events (id, title, description, type, location, date, time, max_participants, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        data.title,
        data.description,
        data.type,
        data.location,
        data.date,
        data.time,
        data.max_participants ?? null,
        created_at
      );
    return this.getById(id)!;
  },

  delete(id: string): void {
    getDb().prepare('DELETE FROM events WHERE id = ?').run(id);
  },

  getWithAvailabilities(id: string): EventWithAvailabilities | null {
    const event = this.getById(id);
    if (!event) return null;
    const availabilities = getDb()
      .prepare('SELECT * FROM availabilities WHERE event_id = ? ORDER BY created_at ASC')
      .all(id) as Availability[];
    return { ...event, availabilities };
  },
};

export const availabilitiesDb = {
  upsert(data: Omit<Availability, 'id' | 'created_at'>): Availability {
    const existing = getDb()
      .prepare('SELECT * FROM availabilities WHERE event_id = ? AND user_name = ?')
      .get(data.event_id, data.user_name) as Availability | undefined;

    if (existing) {
      getDb()
        .prepare('UPDATE availabilities SET status = ?, user_email = ?, note = ? WHERE id = ?')
        .run(data.status, data.user_email, data.note, existing.id);
      return getDb()
        .prepare('SELECT * FROM availabilities WHERE id = ?')
        .get(existing.id) as Availability;
    }

    const id = randomUUID();
    const created_at = new Date().toISOString();
    getDb()
      .prepare(
        `INSERT INTO availabilities (id, event_id, user_name, user_email, status, note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, data.event_id, data.user_name, data.user_email, data.status, data.note, created_at);
    return getDb()
      .prepare('SELECT * FROM availabilities WHERE id = ?')
      .get(id) as Availability;
  },
};
