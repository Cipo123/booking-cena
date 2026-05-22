import { NextRequest, NextResponse } from 'next/server';
import { pollsDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const poll = await pollsDb.getById(id);
    if (!poll) return NextResponse.json({ error: 'Sondaggio non trovato' }, { status: 404 });
    if (poll.closed) return NextResponse.json({ error: 'Sondaggio chiuso' }, { status: 403 });

    const { votes, user_name, user_email } = await req.json();
    // votes: { [optionId]: 'yes' | 'maybe' | 'no' }
    if (!user_name?.trim() || typeof votes !== 'object') {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 });
    }
    for (const [optionId, status] of Object.entries(votes)) {
      if (!['yes', 'maybe', 'no'].includes(status as string)) continue;
      await pollsDb.vote(optionId, {
        user_name: user_name.trim(),
        user_email: user_email ?? '',
        status: status as 'yes' | 'maybe' | 'no',
      });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
