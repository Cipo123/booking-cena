'use client';

import { useEffect, useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useLang } from '@/context/providers';
import type { Event, EventGroup } from '@/lib/db';

// Formato salvato in localStorage
interface StoredAuth {
  code: string;
  group: Omit<EventGroup, 'access_key'>;
  events: Event[];
}

function saveAuth(storageKey: string, auth: StoredAuth) {
  localStorage.setItem(storageKey, JSON.stringify(auth));
}

function loadAuth(storageKey: string): StoredAuth | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Nuovo formato: oggetto con code/group/events
    if (parsed && typeof parsed === 'object' && parsed.code && parsed.group) return parsed as StoredAuth;
    // Vecchio formato: stringa semplice (solo codice)
    if (typeof parsed === 'string') return { code: parsed, group: null as any, events: [] };
    return null;
  } catch {
    return null;
  }
}

/* ─── EventRow ─── */
function EventRow({ event }: { event: Event }) {
  const dateStr = new Date(event.date + 'T00:00:00').toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const href  = event.slug ? `/e/${event.slug}` : `/event/${event.id}`;
  const yes   = event.yes_count   ?? 0;
  const maybe = event.maybe_count ?? 0;
  const total = yes + maybe + (event.no_count ?? 0);

  return (
    <Link
      href={href}
      className="glass rounded-2xl overflow-hidden flex gap-0 hover:scale-[1.01] transition-transform block"
    >
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

/* ─── GroupPage ─── */
export default function GroupPage() {
  const { slug } = useParams<{ slug: string }>();
  const { tr }   = useLang();
  const storageKey = `bookingcena_group_${slug}`;

  const typeLabels: Record<string, string> = {
    corso:    tr.groups.typeCourse,
    progetto: tr.groups.typeProject,
    compagnia: tr.groups.typeGroup,
    altro:    tr.groups.typeOther,
  };

  const [inputKey, setInputKey] = useState('');
  const [group, setGroup]       = useState<Omit<EventGroup, 'access_key'> | null>(null);
  const [events, setEvents]     = useState<Event[]>([]);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  // checking = true solo se non abbiamo dati cached (primo caricamento senza cache)
  const [checking, setChecking] = useState(true);

  /* ── ri-verifica silenziosa in background ── */
  const silentVerify = useCallback(async (code: string) => {
    try {
      const res = await fetch(`/api/groups/${slug}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: code }),
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem(storageKey);
          setGroup(null); setEvents([]);
        }
        return;
      }
      const data = await res.json();
      setGroup(data.group);
      setEvents(data.events);
      saveAuth(storageKey, { code, group: data.group, events: data.events });
    } catch { /* ignora errori di rete, mantiene cache */ }
  }, [slug, storageKey]);

  /* ── mount: carica dalla cache, poi ri-verifica in background ── */
  useEffect(() => {
    const stored = loadAuth(storageKey);
    if (!stored) {
      setChecking(false);
      return;
    }
    if (stored.group) {
      setGroup(stored.group);
      setEvents(stored.events);
      setChecking(false);
      silentVerify(stored.code);
    } else {
      fullVerify(stored.code);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  /* ── verifica completa (primo accesso o vecchio formato) ── */
  async function fullVerify(k: string) {
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
        setError(res.status === 401 ? tr.groups.wrongCode : (data.error ?? tr.groups.networkError));
        return;
      }
      setGroup(data.group);
      setEvents(data.events);
      saveAuth(storageKey, { code: k, group: data.group, events: data.events });
    } catch {
      setError(tr.groups.networkError);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!inputKey.trim()) return;
    fullVerify(inputKey.trim());
  }

  function logout() {
    localStorage.removeItem(storageKey);
    setGroup(null); setEvents([]);
  }

  /* ─── Spinner (solo se nessuna cache e verifica in corso) ─── */
  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">🔑</div>
          <p style={{ color: 'var(--text-muted)' }}>{tr.groups.verifyingAccess}</p>
        </div>
      </div>
    );
  }

  /* ─── Autenticato → mostra eventi ─── */
  if (group) {
    const typeLabel = typeLabels[group.type] ?? tr.groups.typeOther;
    const upcoming  = events.filter(e => new Date(`${e.date}T${e.time}`) >= new Date(Date.now() - 2 * 3600_000));
    const past      = events.filter(e => new Date(`${e.date}T${e.time}`) <  new Date(Date.now() - 2 * 3600_000));

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fadeInUp">
        {/* Header gruppo */}
        <div className="glass rounded-2xl p-6 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span
                className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full"
                style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}
              >
                {typeLabel}
              </span>
              <h1 className="text-2xl font-black mt-2" style={{ color: 'var(--text-primary)' }}>{group.name}</h1>
              {group.description && (
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{group.description}</p>
              )}
            </div>
            <button
              onClick={logout}
              className="shrink-0 text-xs opacity-40 hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-muted)' }}
            >
              {tr.groups.logoutBtn}
            </button>
          </div>
          <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {events.length} {events.length !== 1 ? 'eventi' : 'evento'} · {tr.groups.savedDevice}
          </p>
        </div>

        {/* Prossimi */}
        {upcoming.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-wide px-1" style={{ color: 'var(--text-muted)' }}>
              📅 {tr.groups.upcoming} ({upcoming.length})
            </h2>
            {upcoming.map(e => <EventRow key={e.id} event={e} />)}
          </div>
        )}

        {/* Passati */}
        {past.length > 0 && (
          <div className="space-y-2 opacity-60">
            <h2 className="text-sm font-bold uppercase tracking-wide px-1" style={{ color: 'var(--text-muted)' }}>
              🗂️ {tr.groups.past} ({past.length})
            </h2>
            {past.map(e => <EventRow key={e.id} event={e} />)}
          </div>
        )}

        {events.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            {tr.groups.noEvents}
          </div>
        )}
      </div>
    );
  }

  /* ─── Form di sblocco ─── */
  return (
    <div className="max-w-sm mx-auto mt-16 space-y-6 animate-fadeInUp">
      <div className="text-center space-y-2">
        <div className="text-5xl">🔐</div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
          {tr.groups.loginTitle}
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {tr.groups.loginSub}
        </p>
      </div>
      <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wide font-semibold mb-1"
            style={{ color: 'var(--text-muted)' }}>
            {tr.groups.codeLabel}
          </label>
          <input
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            placeholder={tr.groups.codePlaceholder}
            autoFocus
            maxLength={80}
          />
        </div>
        {error && (
          <p className="text-sm rounded-xl px-3 py-2"
            style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full rounded-xl py-3 text-white font-bold text-sm disabled:opacity-60"
        >
          {loading ? `⏳ ${tr.groups.verifyingAccess}` : tr.groups.enterBtn}
        </button>
      </form>
    </div>
  );
}
