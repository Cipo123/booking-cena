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
