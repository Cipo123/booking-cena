import postgres from 'postgres';
import { randomUUID } from 'crypto';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL non configurata nelle variabili d\'ambiente');
}

// Connessione pooled — ottimale per Vercel serverless
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require',
  max: 5,
  idle_timeout: 20,
  connect_timeout: 10,
});

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
  async getAll(): Promise<Event[]> {
    const rows = await sql<Event[]>`
      SELECT * FROM events ORDER BY date ASC, time ASC
    `;
    return rows;
  },

  async getById(id: string): Promise<Event | null> {
    const rows = await sql<Event[]>`
      SELECT * FROM events WHERE id = ${id} LIMIT 1
    `;
    return rows[0] ?? null;
  },

  async create(data: Omit<Event, 'id' | 'created_at'>): Promise<Event> {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    const rows = await sql<Event[]>`
      INSERT INTO events (id, title, description, type, location, date, time, max_participants, created_at)
      VALUES (${id}, ${data.title}, ${data.description}, ${data.type}, ${data.location},
              ${data.date}, ${data.time}, ${data.max_participants ?? null}, ${created_at})
      RETURNING *
    `;
    return rows[0];
  },

  async delete(id: string): Promise<void> {
    await sql`DELETE FROM events WHERE id = ${id}`;
  },

  async getWithAvailabilities(id: string): Promise<EventWithAvailabilities | null> {
    const event = await this.getById(id);
    if (!event) return null;
    const availabilities = await sql<Availability[]>`
      SELECT * FROM availabilities WHERE event_id = ${id} ORDER BY created_at ASC
    `;
    return { ...event, availabilities };
  },
};

export const availabilitiesDb = {
  async upsert(data: Omit<Availability, 'id' | 'created_at'>): Promise<Availability> {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    const rows = await sql<Availability[]>`
      INSERT INTO availabilities (id, event_id, user_name, user_email, status, note, created_at)
      VALUES (${id}, ${data.event_id}, ${data.user_name}, ${data.user_email},
              ${data.status}, ${data.note}, ${created_at})
      ON CONFLICT (event_id, user_name)
      DO UPDATE SET
        status     = EXCLUDED.status,
        user_email = EXCLUDED.user_email,
        note       = EXCLUDED.note
      RETURNING *
    `;
    return rows[0];
  },
};
