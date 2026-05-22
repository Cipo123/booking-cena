import postgres from 'postgres';
import { randomUUID } from 'crypto';

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL non configurata");
}

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
  rsvp_deadline: string | null;
  created_at: string;
  parts_count?: number;
}

export interface EventPart {
  id: string;
  event_id: string;
  title: string;
  type: EventType;
  description: string;
  location: string;
  time: string;
  end_time: string;
  order_index: number;
  created_at: string;
}

export interface Availability {
  id: string;
  event_id: string;
  part_id: string | null;
  user_name: string;
  user_email: string;
  status: 'yes' | 'maybe' | 'no';
  note: string;
  created_at: string;
}

export interface EventWithAvailabilities extends Event {
  availabilities: Availability[];
  parts: EventPart[];
}

/* ── Events ──────────────────────────────────────────────── */
export const eventsDb = {
  async getAll(): Promise<Event[]> {
    return sql<Event[]>`
      SELECT e.*, COUNT(ep.id)::int AS parts_count
      FROM events e
      LEFT JOIN event_parts ep ON ep.event_id = e.id
      GROUP BY e.id
      ORDER BY e.date ASC, e.time ASC
    `;
  },

  async getById(id: string): Promise<Event | null> {
    const rows = await sql<Event[]>`SELECT * FROM events WHERE id = ${id} LIMIT 1`;
    return rows[0] ?? null;
  },

  async create(
    data: Omit<Event, 'id' | 'created_at' | 'parts_count'>,
    parts?: Omit<EventPart, 'id' | 'event_id' | 'created_at'>[]
  ): Promise<Event> {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    await sql`
      INSERT INTO events (id, title, description, type, location, date, time, max_participants, rsvp_deadline, created_at)
      VALUES (${id}, ${data.title}, ${data.description}, ${data.type}, ${data.location},
              ${data.date}, ${data.time}, ${data.max_participants ?? null},
              ${data.rsvp_deadline ?? null}, ${created_at})
    `;
    if (parts && parts.length > 0) {
      for (const [i, part] of parts.entries()) {
        await eventPartsDb.create(id, { ...part, order_index: i });
      }
    }
    return (await sql<Event[]>`SELECT * FROM events WHERE id = ${id}`)[0];
  },

  async delete(id: string): Promise<void> {
    await sql`DELETE FROM events WHERE id = ${id}`;
  },

  async getWithAvailabilities(id: string): Promise<EventWithAvailabilities | null> {
    const events = await sql<Event[]>`SELECT * FROM events WHERE id = ${id} LIMIT 1`;
    if (!events[0]) return null;
    const [availabilities, parts] = await Promise.all([
      sql<Availability[]>`SELECT * FROM availabilities WHERE event_id = ${id} ORDER BY created_at ASC`,
      sql<EventPart[]>`SELECT * FROM event_parts WHERE event_id = ${id} ORDER BY order_index ASC`,
    ]);
    return { ...events[0], availabilities, parts };
  },
};

/* ── Event Parts ─────────────────────────────────────────── */
export const eventPartsDb = {
  async create(
    event_id: string,
    data: Omit<EventPart, 'id' | 'event_id' | 'created_at'>
  ): Promise<EventPart> {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    const rows = await sql<EventPart[]>`
      INSERT INTO event_parts (id, event_id, title, type, description, location, time, end_time, order_index, created_at)
      VALUES (${id}, ${event_id}, ${data.title}, ${data.type}, ${data.description},
              ${data.location}, ${data.time}, ${data.end_time ?? ''}, ${data.order_index}, ${created_at})
      RETURNING *
    `;
    return rows[0];
  },
};

/* ── Availabilities ──────────────────────────────────────── */
export const availabilitiesDb = {
  async upsert(data: Omit<Availability, 'id' | 'created_at'>): Promise<Availability> {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    const rows = await sql<Availability[]>`
      INSERT INTO availabilities (id, event_id, part_id, user_name, user_email, status, note, created_at)
      VALUES (${id}, ${data.event_id}, ${data.part_id ?? null}, ${data.user_name},
              ${data.user_email}, ${data.status}, ${data.note}, ${created_at})
      ON CONFLICT (event_id, user_name, part_id) DO UPDATE
        SET status     = EXCLUDED.status,
            user_email = EXCLUDED.user_email,
            note       = EXCLUDED.note
      RETURNING *
    `;
    return rows[0];
  },
};
