'use client';

import { useEffect, useState } from 'react';

interface Props {
  eventId: string;
  lang: string;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

type SubState = 'idle' | 'subscribing' | 'subscribed' | 'unsupported' | 'error';

export default function PushSubscribeBtn({ eventId, lang }: Props) {
  const [state, setState] = useState<SubState>('idle');
  const [vapidKey, setVapidKey] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }
    fetch('/api/vapid-public-key').then(r => r.json()).then(d => {
      if (d.key) setVapidKey(d.key);
      else setState('unsupported');
    });
    // Register SW
    navigator.serviceWorker.register('/sw.js').catch(() => setState('unsupported'));
    // Check if already subscribed
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => {
        if (sub) setState('subscribed');
      })
    );
  }, []);

  if (state === 'unsupported' || !vapidKey) return null;

  async function toggle() {
    if (state === 'subscribed') {
      // Unsubscribe
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setState('idle');
      return;
    }

    setState('subscribing');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey!),
      });
      const json = sub.toJSON();
      await fetch(`/api/events/${eventId}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });
      setState('subscribed');
    } catch {
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  const labels: Record<SubState, { icon: string; it: string; en: string; cls: string }> = {
    idle:        { icon: '🔔', it: 'Notificami', en: 'Notify me', cls: 'glass-strong' },
    subscribing: { icon: '⏳', it: 'Attendi...', en: 'Subscribing...', cls: 'glass-strong opacity-60' },
    subscribed:  { icon: '🔕', it: 'Notifiche attive', en: 'Notifications on', cls: 'glass-strong' },
    unsupported: { icon: '', it: '', en: '', cls: '' },
    error:       { icon: '❌', it: 'Errore', en: 'Error', cls: 'glass-strong opacity-60' },
  };
  const l = labels[state];

  return (
    <button
      onClick={toggle}
      disabled={state === 'subscribing'}
      className={`${l.cls} rounded-xl px-4 py-2 text-sm flex items-center gap-2 transition-all hover:scale-105`}
      style={{ color: state === 'subscribed' ? '#34d399' : 'var(--text-secondary)' }}
    >
      <span>{l.icon}</span>
      <span>{lang === 'it' ? l.it : l.en}</span>
    </button>
  );
}
