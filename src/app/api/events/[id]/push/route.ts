import { NextRequest, NextResponse } from 'next/server';
import { pushDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { endpoint, p256dh, auth } = await req.json();
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Dati subscription mancanti' }, { status: 400 });
    }
    await pushDb.subscribe({ event_id: id, endpoint, p256dh, auth_key: auth });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
