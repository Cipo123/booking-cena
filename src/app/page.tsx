'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLang } from '@/context/providers';
import EventCard from '@/components/EventCard';
import type { Event } from '@/lib/db';

interface SavedSession {
  slug: string;
  name: string;
  type: string;
}

const TYPE_EMOJI: Record<string, string> = {
  corso: '🎓', progetto: '💼', compagnia: '👥', altro: '🏷️',
};

function GroupAccessWidget() {
  const router = useRouter();
  const { tr } = useLang();

  // Sessioni salvate in localStorage
  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Nuovo codice
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Al mount legge le sessioni dal localStorage
  useEffect(() => {
    const found: SavedSession[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith('bookingcena_group_')) continue;
      const slug = key.replace('bookingcena_group_', '');
      try {
        const raw = localStorage.getItem(key) ?? '';
        const data = JSON.parse(raw);
        if (data?.group?.name) {
          found.push({ slug, name: data.group.name, type: data.group.type ?? 'altro' });
        } else {
          // Vecchio formato stringa — usa lo slug come nome
          found.push({ slug, name: slug, type: 'altro' });
        }
      } catch {
        found.push({ slug, name: slug, type: 'altro' });
      }
    }
    setSessions(found);
    // Se non ci sono sessioni salvate mostra subito il form
    if (found.length === 0) setShowForm(true);
  }, []);

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

  const hasSessions = sessions.length > 0;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(99,102,241,0.12) 100%)',
        border: '1px solid rgba(99,102,241,0.35)',
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <span className="text-3xl">🔐</span>
        <div>
          <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
            {hasSessions ? tr.home.groupSessionsTitle : tr.home.groupTitle}
          </p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {hasSessions ? tr.home.groupSessionsSub : tr.home.groupSub}
          </p>
        </div>
      </div>

      {/* Sessioni attive: bottoni diretti */}
      {hasSessions && (
        <div className="px-5 pb-4 space-y-2">
          {sessions.map(s => (
            <button
              key={s.slug}
              onClick={() => router.push(`/g/${s.slug}`)}
              className="w-full flex items-center justify-between gap-3 glass-strong rounded-xl px-4 py-3 transition-all hover:scale-[1.01] active:scale-[0.99] text-left"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-lg shrink-0">{TYPE_EMOJI[s.type] ?? '🏷️'}</span>
                <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                  {s.name}
                </span>
              </div>
              <span
                className="text-sm shrink-0 font-bold"
                style={{ color: '#60a5fa' }}
              >
                {tr.home.groupReenter}
              </span>
            </button>
          ))}

          {/* Toggle per usare un altro codice */}
          <button
            onClick={() => setShowForm(v => !v)}
            className="text-xs mt-1 transition-opacity hover:opacity-80 flex items-center gap-1"
            style={{ color: 'var(--text-muted)' }}
          >
            {showForm ? '▲' : '+'} {tr.home.groupOtherCode}
          </button>
        </div>
      )}

      {/* Form per inserire un codice */}
      {showForm && (
        <form
          onSubmit={go}
          className="px-5 pb-5 space-y-3"
          style={hasSessions ? { borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1rem' } : { paddingTop: '0.25rem' }}
        >
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
