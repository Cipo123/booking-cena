import { NextRequest, NextResponse } from 'next/server';
import { photosDb } from '@/lib/db';

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const BUCKET = 'event-photos';

async function uploadToSupabase(file: File, path: string): Promise<string> {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': file.type,
      'x-upsert': 'true',
    },
    body: await file.arrayBuffer(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload Supabase fallito: ${err}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

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

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json(
        { error: 'Storage non configurato. Aggiungi SUPABASE_URL e SUPABASE_SERVICE_KEY.' },
        { status: 503 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const uploader_name = (formData.get('uploader_name') as string | null)?.trim() ?? 'Anonimo';

    if (!file) return NextResponse.json({ error: 'Nessun file allegato' }, { status: 400 });
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: 'File troppo grande (max 8 MB)' }, { status: 400 });
    if (!file.type.startsWith('image/')) return NextResponse.json({ error: 'Solo immagini consentite' }, { status: 400 });

    const ext = file.name.split('.').pop() ?? 'jpg';
    const storagePath = `${id}/${Date.now()}.${ext}`;
    const publicUrl = await uploadToSupabase(file, storagePath);

    const photo = await photosDb.create({
      event_id: id,
      url: publicUrl,
      uploader_name: uploader_name.substring(0, 60),
    });
    return NextResponse.json(photo, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Errore upload';
    return NextResponse.json({ error: msg }, { status: 500 });
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
