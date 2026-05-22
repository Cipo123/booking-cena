import { NextRequest, NextResponse } from 'next/server';
import { groupsDb } from '@/lib/db';

function isAdmin(req: NextRequest) {
  return req.headers.get('x-admin-password') === (process.env.ADMIN_PASSWORD ?? 'admin123');
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await groupsDb.update(id, body);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  try {
    const { id } = await params;
    await groupsDb.delete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
