'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Event, EventGroup } from '@/lib/db';

const GROUP_TYPE_LABEL: Record<string, string> = {
  corso: '🎓 Corso', progetto: '💼 Progetto',
  compagnia: '👥 Compagnia', altro: '🏷️ Gruppo',
};

function EventRow({ event }: { event: Event }) {
  const dateStr = new Date(event.date + 'T00:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const href = event.slug ? `/e/${event.slug}` : `/event/${event.id}`;
  const yes   = event.yes_count   ?? 0;
  const maybe = event.maybe_count ?? 0;
  const total = yes + maybe + (event.no_count ?? 0);

  return (
    <Link href={href}
      className="glass rounded-2xl overflow-hidden flex gap-0 hover:scale-[1.01] transition-transform block">
      <div className="w-1.5 shrink-0 bg-gradient-to-b from-blue-500 to-indigo-600" />
      <div className="flex-1 px-4 py-4 flex items-center justify-between gap-3 min-w-0">
        <div className="min-w-0">
          <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            📅 {dateStr}
            {event.location && <> · 📍 {event.location}</>}
          </p>
          {total > 0 && (
            <p className="text-xs mt-1 flex gap-2">
              <span className="text-emerald-400">✅ {yes}</span>
              <span className="text-amber-400">🤔 {maybe}</span>
            </p>
          )}
        </div>
        <span className="text-xl shrink-0 opacity-40">→</span>
      </div>
    </Link>
  );
}

export default function GroupPage() {
  const { slug } = useParams<{ slug: string }>();
  const storageKey = `bookingcena_group_${slug}`;

  const [key, setKey]         = useState('');
  const [inputKey, setInputKey] = useState('');
  const [group, setGroup]     = useState<Omit<EventGroup, 'access_key'> | null>(null);
  const [events, setEvents]   = useState<Event[]>([]);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // Al mount: se c'è una chiave salvata, verifica subito
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      verify(saved);
    } else {
      setChecking(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function verify(k: string) {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/groups/${slug}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: k }),
      });
      const data = await res.json();
      if (!res.ok) {
        localStorage.removeItem(storageKey);
        setError(res.status === 401 ? 'Chiave non corretta. Riprova.' : (data.error ?? 'Errore'));
        setChecking(false);
        return;
      }
      localStorage.setItem(storageKey, k);
      setKey(k);
      setGroup(data.group);
      setEvents(data.events);
    } catch {
      setError('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputKey.trim()) return;
    verify(inputKey.trim());
  }

  function logout() {
    localStorage.removeItem(storageKey);
    setKey(''); setGroup(null); setEvents([]);
  }

  // Verifica in corso (chiave salvata)
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">🔑</div>
          <p style={{ color: 'var(--text-muted)' }}>Verifica accesso...</p>
        </div>
      </div>
    );
  }

  // Autenticato → mostra eventi del gruppo
  if (group) {
    const typeLabel = GROUP_TYPE_LABEL[group.type] ?? '🏷️ Gruppo';
    const upcoming = events.filter(e => new Date(e.date + 'T23:59:59') >= new Date());
    const past     = events.filter(e => new Date(e.date + 'T23:59:59') <  new Date());

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeInUp">
        {/* Header */}
        <div className="glass rounded-2xl p-6 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}>
                {typeLabel}
              </span>
              <h1 className="text-2xl font-black mt-2" style={{ color: 'var(--text-primary)' }}>{group.name}</h1>
              {group.description && (
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{group.description}</p>
              )}
            </div>
            <button onClick={logout}
              className="shrink-0 text-xs opacity-40 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)' }}>
              🔒 Esci
            </button>
          </div>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {events.length} event{events.length !== 1 ? 'i' : 'o'} · /g/{slug}
          </p>
        </div>

        {/* Prossimi */}
        {upcoming.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide px-1" style={{ color: 'var(--text-muted)' }}>
              📅 Prossimi ({upcoming.length})
            </h2>
            {upcoming.map(e => <EventRow key={e.id} event={e} />)}
          </div>
        )}

        {/* Passati */}
        {past.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide px-1" style={{ color: 'var(--text-muted)' }}>
              🗂️ Passati ({past.length})
            </h2>
            {past.map(e => <EventRow key={e.id} event={e} />)}
          </div>
        )}

        {events.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            Nessun evento in questo gruppo ancora.
          </div>
        )}
      </div>
    );
  }

  // Form di sblocco
  return (
    <div className="max-w-sm mx-auto mt-16 space-y-6 animate-fadeInUp">
      <div className="text-center space-y-2">
        <div className="text-5xl">🔐</div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
          Accesso gruppo
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Inserisci la chiave fornita dall'organizzatore per vedere gli eventi.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wide font-semibold mb-1"
            style={{ color: 'var(--text-muted)' }}>Chiave di accesso</label>
          <input
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            placeholder="es. corso2024"
            autoFocus
            maxLength={80}
          />
        </div>
        {error && (
          <p className="text-sm rounded-xl px-3 py-2"
            style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}>{error}</p>
        )}
        <button type="submit" disabled={loading}
          className="btn-primary w-full rounded-xl py-3 text-white font-bold text-sm disabled:opacity-60">
          {loading ? '⏳ Verifica...' : '🔓 Accedi al gruppo'}
        </button>
      </form>
    </div>
  );
}
