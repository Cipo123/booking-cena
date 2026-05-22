import { NextRequest, NextResponse } from 'next/server';
import { eventsDb } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  if (req.headers.get('x-admin-password') !== adminPassword) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const { id } = await params;
  await eventsDb.restore(id);
  return NextResponse.json({ ok: true });
}
