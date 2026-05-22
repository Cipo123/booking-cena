import { NextRequest, NextResponse } from 'next/server';
import { commentsDb } from '@/lib/db';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const comments = await commentsDb.getByEventId(id);
    return NextResponse.json(comments);
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { user_name, message } = await req.json();
    if (!user_name?.trim() || !message?.trim()) {
      return NextResponse.json({ error: 'Nome e messaggio obbligatori' }, { status: 400 });
    }
    if (message.trim().length > 500) {
      return NextResponse.json({ error: 'Messaggio troppo lungo (max 500 caratteri)' }, { status: 400 });
    }
    const comment = await commentsDb.create({
      event_id: id,
      user_name: user_name.trim().substring(0, 60),
      message: message.trim(),
    });
    return NextResponse.json(comment, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
    if (req.headers.get('x-admin-password') !== adminPassword) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    const { comment_id } = await req.json();
    await commentsDb.delete(comment_id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
