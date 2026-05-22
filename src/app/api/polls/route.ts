import { NextRequest, NextResponse } from 'next/server';
import { pollsDb } from '@/lib/db';

export async function GET() {
  try {
    const polls = await pollsDb.getAll();
    return NextResponse.json(polls);
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
    if (req.headers.get('x-admin-password') !== adminPassword) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    const { title, description, options } = await req.json();
    if (!title?.trim() || !Array.isArray(options) || options.length < 2) {
      return NextResponse.json({ error: 'Titolo e almeno 2 opzioni obbligatori' }, { status: 400 });
    }
    const poll = await pollsDb.create(
      { title: title.trim(), description: description ?? '', closed: false },
      options
    );
    return NextResponse.json(poll, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
