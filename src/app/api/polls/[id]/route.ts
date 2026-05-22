import { NextRequest, NextResponse } from 'next/server';
import { pollsDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const poll = await pollsDb.getById(id);
    if (!poll) return NextResponse.json({ error: 'Sondaggio non trovato' }, { status: 404 });
    return NextResponse.json(poll);
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
    if (req.headers.get('x-admin-password') !== adminPassword) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    const { id } = await params;
    await pollsDb.delete(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
