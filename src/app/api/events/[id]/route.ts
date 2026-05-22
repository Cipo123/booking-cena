import { NextRequest, NextResponse } from 'next/server';
import { eventsDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const event = await eventsDb.getWithAvailabilities(id);
    if (!event) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 });
    return NextResponse.json(event);
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
    if (req.headers.get('x-admin-password') !== adminPassword) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = await params;
    if (!(await eventsDb.getById(id))) {
      return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, type, location, date, time, max_participants, rsvp_deadline, parts } = body;

    const isMulti  = Array.isArray(parts) && parts.length > 0;
    const eventTime = isMulti ? (parts[0]?.time ?? '') : time;

    if (!title || !date || (!isMulti && !time)) {
      return NextResponse.json({ error: 'Titolo, data e ora sono obbligatori' }, { status: 400 });
    }

    const updated = await eventsDb.update(
      id,
      {
        title,
        description: description ?? '',
        type: isMulti ? 'altro' : (type ?? 'cena'),
        location: isMulti ? '' : (location ?? ''),
        date,
        time: eventTime,
        max_participants: max_participants ? Number(max_participants) : null,
        rsvp_deadline: rsvp_deadline ?? null,
      },
      Array.isArray(parts) ? parts : [],
    );

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
    const authHeader = req.headers.get('x-admin-password');
    if (authHeader !== adminPassword) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = await params;
    const event = await eventsDb.getById(id);
    if (!event) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 });

    await eventsDb.delete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
