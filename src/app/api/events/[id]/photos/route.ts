import { NextRequest, NextResponse } from 'next/server';
import { photosDb } from '@/lib/db';
import { put } from '@vercel/blob';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const photos = await photosDb.getByEventId(id);
    return NextResponse.json(photos);
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Storage non configurato. Aggiungi BLOB_READ_WRITE_TOKEN.' }, { status: 503 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploader_name = (formData.get('uploader_name') as string | null)?.trim() ?? 'Anonimo';

    if (!file) return NextResponse.json({ error: 'Nessun file allegato' }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'File troppo grande (max 8 MB)' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Solo immagini consentite' }, { status: 400 });

    const ext = file.name.split('.').pop() ?? 'jpg';
    const blob = await put(`events/${id}/${Date.now()}.${ext}`, file, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const photo = await photosDb.create({
      event_id: id,
      url: blob.url,
      uploader_name: uploader_name.substring(0, 60),
    });
    return NextResponse.json(photo, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Errore upload' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
    if (req.headers.get('x-admin-password') !== adminPassword) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }
    const { photo_id } = await req.json();
    await photosDb.delete(photo_id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Errore server' }, { status: 500 });
  }
}
