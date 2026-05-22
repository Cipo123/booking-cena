import { NextRequest, NextResponse } from 'next/server';
import { groupsDb } from '@/lib/db';

// POST /api/groups/access
// Body: { code: string }
// Ricerca il gruppo tramite il codice (access_key) e restituisce slug + group + events.
// Non espone access_key nella risposta.
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!code?.trim()) {
      return NextResponse.json({ error: 'Codice mancante' }, { status: 400 });
    }

    const group = await groupsDb.getByAccessKey(code.trim());
    if (!group) {
      return NextResponse.json({ error: 'Codice non valido' }, { status: 401 });
    }

    const events = await groupsDb.getEvents(group.id);
    const { access_key: _k, ...safeGroup } = group;

    return NextResponse.json({ group: safeGroup, events, slug: group.slug });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
