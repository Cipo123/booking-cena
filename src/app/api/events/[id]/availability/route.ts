import { NextRequest, NextResponse } from 'next/server';
import { eventsDb, availabilitiesDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const event = await eventsDb.getById(id);
    if (!event) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 });

    const body = await req.json();
    const { user_name, user_email, status, note } = body;

    if (!user_name || !status) {
      return NextResponse.json({ error: 'Nome e stato sono obbligatori' }, { status: 400 });
    }
    if (!['yes', 'maybe', 'no'].includes(status)) {
      return NextResponse.json({ error: 'Stato non valido' }, { status: 400 });
    }

    const availability = await availabilitiesDb.upsert({
      event_id: id,
      user_name: user_name.trim(),
      user_email: user_email?.trim() ?? '',
      status,
      note: note?.trim() ?? '',
    });

    return NextResponse.json(availability, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
