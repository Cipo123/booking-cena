import { NextRequest, NextResponse } from 'next/server';
import { eventsDb } from '@/lib/db';
import { generateICS, generateICSForPart } from '@/lib/calendar';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const partId = req.nextUrl.searchParams.get('part_id');

    // Always fetch full event (includes parts) so ?part_id works
    const event = await eventsDb.getWithAvailabilities(id);
    if (!event) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 });

    if (partId) {
      const part = event.parts.find(p => p.id === partId);
      if (!part) return NextResponse.json({ error: 'Tappa non trovata' }, { status: 404 });
      const ics = generateICSForPart(part, event.date);
      const filename = `${part.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
      return new NextResponse(ics, {
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

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
