import { NextRequest, NextResponse } from 'next/server';
import { groupsDb } from '@/lib/db';

// POST /api/groups/[id]/access
// Body: { key: string }
// Verifica la chiave e restituisce i dati del gruppo + eventi (senza esporre access_key)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { key } = await req.json();

    // id può essere sia UUID che slug
    const group = id.includes('-') && id.length === 36
      ? await groupsDb.getById(id)
      : await groupsDb.getBySlug(id);

    if (!group) return NextResponse.json({ error: 'Gruppo non trovato' }, { status: 404 });
    if (group.access_key !== key?.trim()) {
      return NextResponse.json({ error: 'Chiave non corretta' }, { status: 401 });
    }

    const events = await groupsDb.getEvents(group.id);

    // Non esporre access_key nella risposta
    const { access_key: _key, ...safeGroup } = group;
    return NextResponse.json({ group: safeGroup, events });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
