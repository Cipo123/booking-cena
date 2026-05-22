'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/providers';
import EventCard from '@/components/EventCard';
import type { Event } from '@/lib/db';

function GroupAccessWidget() {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [open, setOpen] = useState(false);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase().replace(/\s+/g, '-');
    if (s) router.push(`/g/${s}`);
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="flex items-center gap-2 font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          🔐 Accedi a un gruppo
        </span>
        <span style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <form onSubmit={go} className="px-5 pb-5 space-y-3 animate-fadeIn">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Inserisci il nome del gruppo (slug) che ti ha condiviso l'organizzatore, poi entra con il codice segreto.
          </p>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 flex-1 glass-strong rounded-xl px-3">
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>/g/</span>
              <input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="nome-del-gruppo"
                maxLength={60}
                className="flex-1 bg-transparent border-0 outline-none py-2 text-sm"
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
            <button
              type="submit"
              className="btn-primary rounded-xl px-4 py-2 text-white font-semibold text-sm shrink-0"
            >
              Entra →
            </button>
          </div>
        </form>
      )}
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
