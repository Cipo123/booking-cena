import { NextRequest, NextResponse } from 'next/server';
import { groupsDb } from '@/lib/db';

function isAdmin(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  return req.headers.get('x-admin-password') === adminPassword;
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  try {
    const groups = await groupsDb.getAll();
    return NextResponse.json(groups);
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  try {
    const { name, description, type, access_key, slug } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nome obbligatorio' }, { status: 400 });
    if (!access_key?.trim()) return NextResponse.json({ error: 'Chiave di accesso obbligatoria' }, { status: 400 });
    const group = await groupsDb.create({
      name: name.trim(),
      description: (description ?? '').trim(),
      type: type ?? 'altro',
      access_key: access_key.trim(),
      slug: (slug ?? name).trim(),
    });
    return NextResponse.json(group, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Errore server';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
