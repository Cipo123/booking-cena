import { NextRequest, NextResponse } from 'next/server';
import { eventsDb } from '@/lib/db';
import { generateICS } from '@/lib/calendar';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const event = await eventsDb.getById(id);
    if (!event) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 });

    const ics = generateICS(event);
    const filename = `${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;

    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Errore generazione ICS' }, { status: 500 });
  }
}
