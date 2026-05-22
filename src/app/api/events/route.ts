import { NextRequest, NextResponse } from 'next/server';
import { eventsDb } from '@/lib/db';

export async function GET() {
  try {
    const events = await eventsDb.getAll();
    return NextResponse.json(events);
  } catch (e) {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
    const authHeader = req.headers.get('x-admin-password');
    if (authHeader !== adminPassword) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, type, location, date, time, max_participants, rsvp_deadline, parts } = body;

    if (!title || !date || !time) {
      return NextResponse.json({ error: 'Titolo, data e ora sono obbligatori' }, { status: 400 });
    }

    const event = await eventsDb.create(
      {
        title,
        description: description ?? '',
        type: type ?? 'cena',
        location: location ?? '',
        date,
        time,
        max_participants: max_participants ? Number(max_participants) : null,
        rsvp_deadline: rsvp_deadline ?? null,
      },
      Array.isArray(parts) && parts.length > 0 ? parts : undefined,
    );

    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
