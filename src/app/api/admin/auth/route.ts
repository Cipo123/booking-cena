import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
  const authHeader = req.headers.get('x-admin-password');
  if (authHeader !== adminPassword) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
