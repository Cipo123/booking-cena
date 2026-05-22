import postgres from 'postgres';
import { randomUUID } from 'crypto';
import { slugify } from './utils';

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
  slug: string | null;
  group_id: string | null;
  meeting_point: string;
  archived: boolean;
  created_at: string;
  parts_count?: number;
  yes_count?: number;
  maybe_count?: number;
  no_count?: number;
}

export type GroupType = 'corso' | 'progetto' | 'compagnia' | 'altro';

export interface EventGroup {
  id: string;
  name: string;
  description: string;
  type: GroupType;
  access_key: string;
  slug: string;
  created_at: string;
  events_count?: number;
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

export interface EventComment {
  id: string;
  event_id: string;
  user_name: string;
  message: string;
  created_at: string;
}

export interface EventPhoto {
  id: string;
  event_id: string;
  url: string;
  uploader_name: string;
  created_at: string;
}

export interface DatePoll {
  id: string;
  title: string;
  description: string;
  closed: boolean;
  created_at: string;
}

export interface DatePollOption {
  id: string;
  poll_id: string;
  label: string;
  date: string;
  time: string;
  order_index: number;
}

export interface DatePollVote {
  id: string;
  option_id: string;
  user_name: string;
  user_email: string;
  status: 'yes' | 'maybe' | 'no';
  created_at: string;
}

export interface DatePollWithDetails extends DatePoll {
  options: (DatePollOption & { votes: DatePollVote[] })[];
}

export interface PushSubscription {
  id: string;
  event_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  created_at: string;
}

async function generateUniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  if (!slug) slug = randomUUID().substring(0, 8);
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await sql`SELECT id FROM events WHERE slug = ${candidate} LIMIT 1`;
    if (existing.length === 0) return candidate;
    attempt++;
  }
}

/* ── Events ──────────────────────────────────────────────── */
export const eventsDb = {
  async getAll(opts?: { publicOnly?: boolean }): Promise<Event[]> {
    if (opts?.publicOnly) {
      return sql<Event[]>`
        SELECT e.*,
          COUNT(DISTINCT ep.id)::int AS parts_count,
          COUNT(DISTINCT CASE WHEN a.status = 'yes'   AND a.part_id IS NULL THEN a.id END)::int AS yes_count,
          COUNT(DISTINCT CASE WHEN a.status = 'maybe' AND a.part_id IS NULL THEN a.id END)::int AS maybe_count,
          COUNT(DISTINCT CASE WHEN a.status = 'no'    AND a.part_id IS NULL THEN a.id END)::int AS no_count
        FROM events e
        LEFT JOIN event_parts  ep ON ep.event_id = e.id
        LEFT JOIN availabilities a ON a.event_id = e.id
        WHERE e.group_id IS NULL AND e.archived = FALSE
        GROUP BY e.id
        ORDER BY e.date ASC, e.time ASC
      `;
    }
    // Admin: returns all events including archived, sorted by archived ASC (active first), then date
    return sql<Event[]>`
      SELECT e.*,
        COUNT(DISTINCT ep.id)::int AS parts_count,
        COUNT(DISTINCT CASE WHEN a.status = 'yes'   AND a.part_id IS NULL THEN a.id END)::int AS yes_count,
        COUNT(DISTINCT CASE WHEN a.status = 'maybe' AND a.part_id IS NULL THEN a.id END)::int AS maybe_count,
        COUNT(DISTINCT CASE WHEN a.status = 'no'    AND a.part_id IS NULL THEN a.id END)::int AS no_count
      FROM events e
      LEFT JOIN event_parts  ep ON ep.event_id = e.id
      LEFT JOIN availabilities a ON a.event_id = e.id
      GROUP BY e.id
      ORDER BY e.archived ASC, e.date ASC, e.time ASC
    `;
  },

  async getById(id: string): Promise<Event | null> {
    const rows = await sql<Event[]>`SELECT * FROM events WHERE id = ${id} LIMIT 1`;
    return rows[0] ?? null;
  },

  async getBySlug(slug: string): Promise<Event | null> {
    const rows = await sql<Event[]>`SELECT * FROM events WHERE slug = ${slug} LIMIT 1`;
    return rows[0] ?? null;
  },

  async create(
    data: Omit<Event, 'id' | 'created_at' | 'parts_count' | 'slug'>,
    parts?: Omit<EventPart, 'id' | 'event_id' | 'created_at'>[],
    customSlug?: string
  ): Promise<Event> {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    const slug = customSlug ? await generateUniqueSlug(customSlug) : await generateUniqueSlug(data.title);
    await sql`
      INSERT INTO events (id, title, description, type, location, date, time, max_participants, rsvp_deadline, slug, group_id, meeting_point, created_at)
      VALUES (${id}, ${data.title}, ${data.description}, ${data.type}, ${data.location},
              ${data.date}, ${data.time}, ${data.max_participants ?? null},
              ${data.rsvp_deadline ?? null}, ${slug}, ${data.group_id ?? null}, ${data.meeting_point ?? ''}, ${created_at})
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

  async archive(id: string): Promise<void> {
    await sql`UPDATE events SET archived = TRUE WHERE id = ${id}`;
  },

  async restore(id: string): Promise<void> {
    await sql`UPDATE events SET archived = FALSE WHERE id = ${id}`;
  },

  async update(
    id: string,
    data: Omit<Event, 'id' | 'created_at' | 'parts_count' | 'slug'>,
    parts: (Omit<EventPart, 'event_id' | 'created_at'> & { id?: string })[],
    customSlug?: string
  ): Promise<Event> {
    // If customSlug provided and differs from current, generate a new unique one
    let slugToSet: string | undefined;
    if (customSlug !== undefined) {
      const current = await this.getById(id);
      if (current?.slug !== customSlug) {
        slugToSet = await generateUniqueSlug(customSlug);
      }
    }

    if (slugToSet !== undefined) {
      await sql`
        UPDATE events SET
          title            = ${data.title},
          description      = ${data.description},
          type             = ${data.type},
          location         = ${data.location},
          date             = ${data.date},
          time             = ${data.time},
          max_participants = ${data.max_participants ?? null},
          rsvp_deadline    = ${data.rsvp_deadline ?? null},
          group_id         = ${data.group_id ?? null},
          meeting_point    = ${data.meeting_point ?? ''},
          slug             = ${slugToSet}
        WHERE id = ${id}
      `;
    } else {
      await sql`
        UPDATE events SET
          title            = ${data.title},
          description      = ${data.description},
          type             = ${data.type},
          location         = ${data.location},
          date             = ${data.date},
          time             = ${data.time},
          max_participants = ${data.max_participants ?? null},
          rsvp_deadline    = ${data.rsvp_deadline ?? null},
          group_id         = ${data.group_id ?? null},
          meeting_point    = ${data.meeting_point ?? ''}
        WHERE id = ${id}
      `;
    }

    const existing = await sql<{ id: string }[]>`SELECT id FROM event_parts WHERE event_id = ${id}`;
    const keepIds  = new Set(parts.filter(p => p.id).map(p => p.id as string));

    for (const { id: partId } of existing.filter(e => !keepIds.has(e.id))) {
      await sql`DELETE FROM availabilities WHERE part_id = ${partId}`;
      await sql`DELETE FROM event_parts  WHERE id        = ${partId}`;
    }

    for (const [i, part] of parts.entries()) {
      if (part.id) {
        await sql`
          UPDATE event_parts SET
            title       = ${part.title},
            type        = ${part.type},
            description = ${part.description},
            location    = ${part.location},
            time        = ${part.time},
            end_time    = ${part.end_time ?? ''},
            order_index = ${i}
          WHERE id = ${part.id} AND event_id = ${id}
        `;
      } else {
        await eventPartsDb.create(id, { ...part, end_time: part.end_time ?? '', order_index: i });
      }
    }

    return (await sql<Event[]>`SELECT * FROM events WHERE id = ${id}`)[0];
  },

  async getWithAvailabilities(idOrSlug: string): Promise<EventWithAvailabilities | null> {
    // Try UUID first, then slug
    let events = await sql<Event[]>`SELECT * FROM events WHERE id = ${idOrSlug} LIMIT 1`;
    if (!events[0]) {
      events = await sql<Event[]>`SELECT * FROM events WHERE slug = ${idOrSlug} LIMIT 1`;
    }
    if (!events[0]) return null;
    const id = events[0].id;
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

/* ── Comments ────────────────────────────────────────────── */
export const commentsDb = {
  async getByEventId(eventId: string): Promise<EventComment[]> {
    return sql<EventComment[]>`
      SELECT * FROM event_comments WHERE event_id = ${eventId}
      ORDER BY created_at ASC
    `;
  },

  async create(data: Omit<EventComment, 'id' | 'created_at'>): Promise<EventComment> {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    const rows = await sql<EventComment[]>`
      INSERT INTO event_comments (id, event_id, user_name, message, created_at)
      VALUES (${id}, ${data.event_id}, ${data.user_name}, ${data.message}, ${created_at})
      RETURNING *
    `;
    return rows[0];
  },

  async delete(id: string): Promise<void> {
    await sql`DELETE FROM event_comments WHERE id = ${id}`;
  },
};

/* ── Photos ──────────────────────────────────────────────── */
export const photosDb = {
  async getByEventId(eventId: string): Promise<EventPhoto[]> {
    return sql<EventPhoto[]>`
      SELECT * FROM event_photos WHERE event_id = ${eventId}
      ORDER BY created_at ASC
    `;
  },

  async create(data: Omit<EventPhoto, 'id' | 'created_at'>): Promise<EventPhoto> {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    const rows = await sql<EventPhoto[]>`
      INSERT INTO event_photos (id, event_id, url, uploader_name, created_at)
      VALUES (${id}, ${data.event_id}, ${data.url}, ${data.uploader_name}, ${created_at})
      RETURNING *
    `;
    return rows[0];
  },

  async delete(id: string): Promise<void> {
    await sql`DELETE FROM event_photos WHERE id = ${id}`;
  },
};

/* ── Date Polls ──────────────────────────────────────────── */
export const pollsDb = {
  async getAll(): Promise<DatePoll[]> {
    return sql<DatePoll[]>`SELECT * FROM date_polls ORDER BY created_at DESC`;
  },

  async getById(id: string): Promise<DatePollWithDetails | null> {
    const polls = await sql<DatePoll[]>`SELECT * FROM date_polls WHERE id = ${id} LIMIT 1`;
    if (!polls[0]) return null;
    const options = await sql<DatePollOption[]>`
      SELECT * FROM date_poll_options WHERE poll_id = ${id} ORDER BY order_index ASC
    `;
    const optionsWithVotes = await Promise.all(
      options.map(async (opt) => {
        const votes = await sql<DatePollVote[]>`
          SELECT * FROM date_poll_votes WHERE option_id = ${opt.id} ORDER BY created_at ASC
        `;
        return { ...opt, votes };
      })
    );
    return { ...polls[0], options: optionsWithVotes };
  },

  async create(
    data: Omit<DatePoll, 'id' | 'created_at'>,
    options: Omit<DatePollOption, 'id' | 'poll_id'>[]
  ): Promise<DatePoll> {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    await sql`
      INSERT INTO date_polls (id, title, description, closed, created_at)
      VALUES (${id}, ${data.title}, ${data.description}, ${data.closed}, ${created_at})
    `;
    for (const [i, opt] of options.entries()) {
      await sql`
        INSERT INTO date_poll_options (id, poll_id, label, date, time, order_index)
        VALUES (${randomUUID()}, ${id}, ${opt.label}, ${opt.date}, ${opt.time}, ${i})
      `;
    }
    return (await sql<DatePoll[]>`SELECT * FROM date_polls WHERE id = ${id}`)[0];
  },

  async vote(
    optionId: string,
    data: Omit<DatePollVote, 'id' | 'created_at' | 'option_id'>
  ): Promise<void> {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    await sql`
      INSERT INTO date_poll_votes (id, option_id, user_name, user_email, status, created_at)
      VALUES (${id}, ${optionId}, ${data.user_name}, ${data.user_email}, ${data.status}, ${created_at})
      ON CONFLICT (option_id, user_name) DO UPDATE
        SET status     = EXCLUDED.status,
            user_email = EXCLUDED.user_email
    `;
  },

  async close(id: string): Promise<void> {
    await sql`UPDATE date_polls SET closed = TRUE WHERE id = ${id}`;
  },

  async delete(id: string): Promise<void> {
    await sql`DELETE FROM date_polls WHERE id = ${id}`;
  },
};

/* ── Push Subscriptions ──────────────────────────────────── */
export const pushDb = {
  async getByEventId(eventId: string): Promise<PushSubscription[]> {
    return sql<PushSubscription[]>`
      SELECT * FROM push_subscriptions WHERE event_id = ${eventId}
    `;
  },

  async subscribe(data: Omit<PushSubscription, 'id' | 'created_at'>): Promise<void> {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    await sql`
      INSERT INTO push_subscriptions (id, event_id, endpoint, p256dh, auth_key, created_at)
      VALUES (${id}, ${data.event_id}, ${data.endpoint}, ${data.p256dh}, ${data.auth_key}, ${created_at})
      ON CONFLICT (event_id, endpoint) DO NOTHING
    `;
  },

  async removeEndpoint(endpoint: string): Promise<void> {
    await sql`DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}`;
  },
};

/* ── Groups ──────────────────────────────────────────────── */
async function generateUniqueGroupSlug(base: string): Promise<string> {
  let slug = slugify(base);
  if (!slug) slug = randomUUID().substring(0, 8);
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await sql`SELECT id FROM event_groups WHERE slug = ${candidate} LIMIT 1`;
    if (existing.length === 0) return candidate;
    attempt++;
  }
}

export const groupsDb = {
  async getAll(): Promise<EventGroup[]> {
    return sql<EventGroup[]>`
      SELECT g.*, COUNT(e.id)::int AS events_count
      FROM event_groups g
      LEFT JOIN events e ON e.group_id = g.id
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `;
  },

  async getBySlug(slug: string): Promise<EventGroup | null> {
    const rows = await sql<EventGroup[]>`SELECT * FROM event_groups WHERE slug = ${slug} LIMIT 1`;
    return rows[0] ?? null;
  },

  async getById(id: string): Promise<EventGroup | null> {
    const rows = await sql<EventGroup[]>`SELECT * FROM event_groups WHERE id = ${id} LIMIT 1`;
    return rows[0] ?? null;
  },

  async getByAccessKey(code: string): Promise<EventGroup | null> {
    const rows = await sql<EventGroup[]>`SELECT * FROM event_groups WHERE access_key = ${code} LIMIT 1`;
    return rows[0] ?? null;
  },

  async create(data: Omit<EventGroup, 'id' | 'created_at' | 'events_count'>): Promise<EventGroup> {
    const id = randomUUID();
    const created_at = new Date().toISOString();
    const slug = await generateUniqueGroupSlug(data.slug || data.name);
    const rows = await sql<EventGroup[]>`
      INSERT INTO event_groups (id, name, description, type, access_key, slug, created_at)
      VALUES (${id}, ${data.name}, ${data.description}, ${data.type}, ${data.access_key}, ${slug}, ${created_at})
      RETURNING *
    `;
    return rows[0];
  },

  async update(id: string, data: Partial<Pick<EventGroup, 'name' | 'description' | 'type' | 'access_key'>>): Promise<EventGroup> {
    const rows = await sql<EventGroup[]>`
      UPDATE event_groups SET
        name        = COALESCE(${data.name        ?? null}, name),
        description = COALESCE(${data.description ?? null}, description),
        type        = COALESCE(${data.type        ?? null}, type),
        access_key  = COALESCE(${data.access_key  ?? null}, access_key)
      WHERE id = ${id}
      RETURNING *
    `;
    return rows[0];
  },

  async delete(id: string): Promise<void> {
    await sql`DELETE FROM event_groups WHERE id = ${id}`;
  },

  async getEvents(groupId: string): Promise<Event[]> {
    return sql<Event[]>`
      SELECT e.*,
        COUNT(DISTINCT ep.id)::int AS parts_count,
        COUNT(DISTINCT CASE WHEN a.status = 'yes'   AND a.part_id IS NULL THEN a.id END)::int AS yes_count,
        COUNT(DISTINCT CASE WHEN a.status = 'maybe' AND a.part_id IS NULL THEN a.id END)::int AS maybe_count,
        COUNT(DISTINCT CASE WHEN a.status = 'no'    AND a.part_id IS NULL THEN a.id END)::int AS no_count
      FROM events e
      LEFT JOIN event_parts  ep ON ep.event_id = e.id
      LEFT JOIN availabilities a ON a.event_id = e.id
      WHERE e.group_id = ${groupId}
      GROUP BY e.id
      ORDER BY e.date ASC, e.time ASC
    `;
  },
};
