'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/providers';
import EventCard from '@/components/EventCard';
import type { Event } from '@/lib/db';

function GroupAccessWidget() {
  const router = useRouter();
  const { tr } = useLang();
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const c = code.trim();
    if (!c) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/groups/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? tr.groups.invalidCode); return; }
      // Salva codice + dati in localStorage → /g/[slug] si apre istantaneamente
      localStorage.setItem(`bookingcena_group_${data.slug}`, JSON.stringify({
        code: c,
        group: data.group,
        events: data.events,
      }));
      router.push(`/g/${data.slug}`);
    } catch {
      setError(tr.groups.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(99,102,241,0.12) 100%)',
        border: '1px solid rgba(99,102,241,0.35)',
      }}
    >
      <div className="px-5 pt-5 pb-2 flex items-center gap-3">
        <span className="text-3xl">🔐</span>
        <div>
          <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            {tr.home.groupTitle}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {tr.home.groupSub}
          </p>
        </div>
      </div>

      <form onSubmit={go} className="px-5 pb-5 pt-3 space-y-3">
        <div className="flex gap-2">
          <input
            value={code}
            onChange={e => { setCode(e.target.value); setError(''); }}
            placeholder={tr.home.groupCodePlaceholder}
            maxLength={80}
            autoComplete="off"
            className="flex-1 rounded-xl px-4 py-3 text-sm"
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: error ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="btn-primary rounded-xl px-5 py-3 text-white font-bold text-sm shrink-0 disabled:opacity-50 transition-opacity"
          >
            {loading ? '⏳' : tr.home.groupEnter}
          </button>
        </div>
        {error && (
          <p className="text-xs rounded-xl px-3 py-2" style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}

export default function HomePage() {
  const { tr } = useLang();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/events')
      .then(r => r.json())
      .then(data => { setEvents(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const now = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const upcoming = events.filter(e => new Date(`${e.date}T${e.time}`) >= now);
  const past     = events.filter(e => new Date(`${e.date}T${e.time}`) < now);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3 py-6 animate-fadeInUp">
        <h1
          className="text-4xl md:text-5xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #60a5fa 0%, #38bdf8 50%, #34d399 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {tr.home.title}
        </h1>
        <p className="text-lg max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          {tr.home.subtitle}
        </p>
      </div>

      {/* Group access widget */}
      <GroupAccessWidget />

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2">
          {[1, 2].map(i => (
            <div key={i} className="glass rounded-2xl h-52 animate-pulse" />
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center space-y-3 animate-fadeInUp">
          <p className="text-5xl">🗓️</p>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {tr.home.empty}
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{tr.home.emptyHint}</p>
        </div>
      ) : (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest px-1" style={{ color: 'var(--text-secondary)' }}>
            {tr.home.upcoming} ({upcoming.length})
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {upcoming.map((event, i) => <EventCard key={event.id} event={event} index={i} />)}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <section className="space-y-4 opacity-50">
          <h2 className="text-sm font-semibold uppercase tracking-widest px-1" style={{ color: 'var(--text-muted)' }}>
            {tr.home.past} ({past.length})
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {past.map((event, i) => <EventCard key={event.id} event={event} index={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}
