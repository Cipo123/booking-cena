'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/context/providers';
import EventCard from '@/components/EventCard';
import type { Event } from '@/lib/db';

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
