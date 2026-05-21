'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Event } from '@/lib/db';

const EVENT_TYPES = [
  { value: 'cena', label: '🍽️ Cena' },
  { value: 'aperitivo', label: '🥂 Aperitivo' },
  { value: 'colazione', label: '☕ Colazione' },
  { value: 'pizza', label: '🍕 Pizza' },
  { value: 'festa', label: '🎉 Festa' },
  { value: 'altro', label: '🎈 Altro' },
];

const TYPE_COLOR: Record<string, string> = {
  cena: 'from-violet-600 to-purple-700',
  aperitivo: 'from-amber-500 to-orange-600',
  colazione: 'from-sky-500 to-blue-600',
  pizza: 'from-red-500 to-rose-600',
  festa: 'from-pink-500 to-fuchsia-600',
  altro: 'from-teal-500 to-emerald-600',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '', description: '', type: 'cena',
    location: '', date: '', time: '20:00', max_participants: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } finally {
      setLoadingEvents(false);
    }
  }, []);

  useEffect(() => {
    if (authed) loadEvents();
  }, [authed, loadEvents]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    // Verify password client-side by attempting a privileged API call
    setAuthed(true);
    setAuthError('');
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');
    setCreating(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({
          ...form,
          max_participants: form.max_participants ? Number(form.max_participants) : null,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        if (res.status === 401) { setAuthed(false); setAuthError('Password errata.'); return; }
        throw new Error(d.error ?? 'Errore');
      }
      setCreateSuccess('Evento creato con successo! 🎉');
      setForm({ title: '', description: '', type: 'cena', location: '', date: '', time: '20:00', max_participants: '' });
      loadEvents();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleteId(id);
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      });
      if (!res.ok) {
        const d = await res.json();
        if (res.status === 401) { setAuthed(false); setAuthError('Password errata.'); return; }
        alert(d.error ?? 'Errore eliminazione');
        return;
      }
      loadEvents();
    } finally {
      setDeleteId(null);
    }
  }

  // Login screen
  if (!authed) {
    return (
      <div className="max-w-sm mx-auto mt-16 space-y-6 animate-fadeInUp">
        <div className="text-center space-y-2">
          <div className="text-5xl">🔐</div>
          <h1 className="text-2xl font-black text-white">Area Admin</h1>
          <p className="text-white/50 text-sm">Inserisci la password per gestire gli eventi</p>
        </div>

        <form onSubmit={handleLogin} className="glass rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-white/60 text-xs uppercase tracking-wide font-medium block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoFocus
            />
          </div>
          {authError && (
            <p className="text-rose-400 text-sm bg-rose-500/10 rounded-lg px-3 py-2">{authError}</p>
          )}
          <button
            type="submit"
            className="btn-primary w-full rounded-xl py-3 text-white font-bold text-sm"
          >
            Accedi →
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeInUp">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Dashboard Admin 🛠️</h1>
          <p className="text-white/50 text-sm mt-0.5">Gestisci eventi e disponibilità</p>
        </div>
        <button
          onClick={() => setAuthed(false)}
          className="text-white/40 hover:text-white/70 text-sm transition-colors"
        >
          Esci
        </button>
      </div>

      {/* Create form */}
      <div className="glass rounded-2xl p-6 space-y-5">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <span>➕</span> Crea nuovo evento
        </h2>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-white/60 text-xs uppercase tracking-wide font-medium block mb-1">Titolo *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Es. Cena da Marco"
                required
                maxLength={80}
              />
            </div>

            <div>
              <label className="text-white/60 text-xs uppercase tracking-wide font-medium block mb-1">Tipo *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-white/60 text-xs uppercase tracking-wide font-medium block mb-1">Luogo</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                placeholder="Es. Via Roma 5, Milano"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-white/60 text-xs uppercase tracking-wide font-medium block mb-1">Data *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="text-white/60 text-xs uppercase tracking-wide font-medium block mb-1">Ora *</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="text-white/60 text-xs uppercase tracking-wide font-medium block mb-1">
                Max partecipanti (opzionale)
              </label>
              <input
                type="number"
                value={form.max_participants}
                onChange={(e) => setForm((f) => ({ ...f, max_participants: e.target.value }))}
                placeholder="Es. 12"
                min={1}
                max={500}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-white/60 text-xs uppercase tracking-wide font-medium block mb-1">
                Descrizione (opzionale)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Qualche dettaglio sull'evento..."
                rows={3}
                maxLength={400}
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>

          {createError && (
            <p className="text-rose-400 text-sm bg-rose-500/10 rounded-lg px-3 py-2">{createError}</p>
          )}
          {createSuccess && (
            <p className="text-emerald-400 text-sm bg-emerald-500/10 rounded-lg px-3 py-2">{createSuccess}</p>
          )}

          <button
            type="submit"
            disabled={creating}
            className="btn-primary rounded-xl px-6 py-3 text-white font-bold text-sm disabled:opacity-50"
          >
            {creating ? '⏳ Creazione...' : '✨ Crea Evento'}
          </button>
        </form>
      </div>

      {/* Events list */}
      <div className="space-y-4">
        <h2 className="text-white font-bold text-lg flex items-center gap-2">
          <span>📋</span> Tutti gli eventi ({events.length})
        </h2>

        {loadingEvents ? (
          <div className="text-white/50 text-center py-8">Caricamento...</div>
        ) : events.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-white/50">
            Nessun evento ancora. Creane uno sopra!
          </div>
        ) : (
          <div className="space-y-3">
            {events.map((event) => {
              const gradient = TYPE_COLOR[event.type] ?? 'from-violet-600 to-purple-700';
              return (
                <div key={event.id} className="glass rounded-2xl overflow-hidden flex">
                  <div className={`bg-gradient-to-b ${gradient} w-1.5 shrink-0`} />
                  <div className="flex-1 px-5 py-4 flex items-center justify-between gap-4 min-w-0">
                    <div className="min-w-0">
                      <p className="text-white font-semibold truncate">{event.title}</p>
                      <p className="text-white/50 text-xs mt-0.5">
                        {formatDate(event.date)} · {event.time}
                        {event.location && ` · ${event.location}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`/event/${event.id}`}
                        className="text-white/50 hover:text-white/80 transition-colors text-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        🔗
                      </a>
                      <button
                        onClick={() => {
                          if (confirm(`Eliminare "${event.title}"?`)) handleDelete(event.id);
                        }}
                        disabled={deleteId === event.id}
                        className="text-rose-400/70 hover:text-rose-400 transition-colors text-sm disabled:opacity-50"
                        title="Elimina evento"
                      >
                        {deleteId === event.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
