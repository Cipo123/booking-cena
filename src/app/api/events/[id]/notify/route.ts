import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { pushDb } from '@/lib/db';

function getVapidConfig() {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? 'mailto:admin@example.com';
  if (!pub || !priv) return null;
  return { pub, priv, email };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD ?? 'admin123';
    if (req.headers.get('x-admin-password') !== adminPassword) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const vapid = getVapidConfig();
    if (!vapid) {
      return NextResponse.json({ error: 'VAPID non configurato' }, { status: 503 });
    }

    webpush.setVapidDetails(vapid.email, vapid.pub, vapid.priv);

    const { id } = await params;
    const { title, body } = await req.json();

    const subscriptions = await pushDb.getByEventId(id);
    const payload = JSON.stringify({ title: title ?? 'BookingCena', body: body ?? 'Aggiornamento evento!' });

    const results = await Promise.allSettled(
      subscriptions.map(sub =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload
        ).catch(async (err: { statusCode?: number }) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await pushDb.removeEndpoint(sub.endpoint);
          }
          throw err;
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    return NextResponse.json({ sent, total: subscriptions.length });
  } catch {
    return NextResponse.json({ error: 'Errore invio notifiche' }, { status: 500 });
  }
}
