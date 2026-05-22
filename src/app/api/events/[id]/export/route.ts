import { NextRequest, NextResponse } from 'next/server';
import { eventsDb } from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
    const authHeader    = req.headers.get('x-admin-password');
    const urlPassword   = req.nextUrl.searchParams.get('password');

    if (authHeader !== adminPassword && urlPassword !== adminPassword) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = await params;
    const event = await eventsDb.getWithAvailabilities(id);
    if (!event) return NextResponse.json({ error: 'Evento non trovato' }, { status: 404 });

    const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;

    const headers = ['Nome', 'Email', 'Stato', 'Tappa', 'Nota', 'Data risposta'];
    const rows = event.availabilities.map(a => {
      const part = event.parts.find(p => p.id === a.part_id);
      return [
        a.user_name,
        a.user_email,
        a.status,
        part?.title ?? '',
        a.note,
        a.created_at,
      ].map(escape).join(',');
    });

    const csv = '﻿' + [headers.join(','), ...rows].join('\r\n');
    const filename = `${event.title.replace(/[^a-z0-9]/gi, '_')}_disponibilita.csv`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
