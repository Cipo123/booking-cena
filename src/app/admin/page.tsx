'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLang } from '@/context/providers';
import type { Event } from '@/lib/db';

const EVENT_TYPES_IT = [
  { value: 'cena', label: '🍽️ Cena' }, { value: 'aperitivo', label: '🥂 Aperitivo' },
  { value: 'colazione', label: '☕ Colazione' }, { value: 'pizza', label: '🍕 Pizza' },
  { value: 'festa', label: '🎉 Festa' }, { value: 'altro', label: '🎈 Altro' },
];
const EVENT_TYPES_EN = [
  { value: 'cena', label: '🍽️ Dinner' }, { value: 'aperitivo', label: '🥂 Aperitif' },
  { value: 'colazione', label: '☕ Breakfast' }, { value: 'pizza', label: '🍕 Pizza' },
  { value: 'festa', label: '🎉 Party' }, { value: 'altro', label: '🎈 Other' },
];
const TYPE_COLOR: Record<string, string> = {
  cena: 'from-violet-600 to-purple-700', aperitivo: 'from-amber-500 to-orange-600',
  colazione: 'from-sky-500 to-blue-600', pizza: 'from-red-500 to-rose-600',
  festa: 'from-pink-500 to-fuchsia-600', altro: 'from-teal-500 to-emerald-600',
};

interface Part { title: string; type: string; location: string; time: string; end_time: string; description: string; }
const emptyPart = (): Part => ({ title: '', type: 'aperitivo', location: '', time: '19:00', end_time: '', description: '' });

export default function AdminPage() {
  const { tr, lang } = useLang();
  const eventTypes = lang === 'it' ? EVENT_TYPES_IT : EVENT_TYPES_EN;

  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isMulti, setIsMulti] = useState(false);
  const [parts, setParts] = useState<Part[]>([emptyPart()]);

  const [form, setForm] = useState({
    title: '', description: '', type: 'cena', location: '', date: '', time: '20:00', max_participants: '', rsvp_deadline: '',
  });
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [creating, setCreating]     = useState(false);
  const [createError, setCreateError]   = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/events');
      if (!res.ok) { setEvents([]); return; }
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch { setEvents([]); } finally { setLoadingEvents(false); }
  }, []);

  useEffect(() => { if (authed) loadEvents(); }, [authed, loadEvents]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(''); setCreateSuccess(''); setCreating(true);
    try {
      const body: Record<string, unknown> = {
        ...form,
        type: isMulti ? 'altro' : form.type,   // multi-tappa: nessuna categoria generale
        max_participants: form.max_participants ? Number(form.max_participants) : null,
        rsvp_deadline: form.rsvp_deadline || null,
      };
      if (isMulti && parts.length > 0) body.parts = parts;

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        if (res.status === 401) { setAuthed(false); setAuthError(tr.admin.loginTitle); return; }
        throw new Error(d.error ?? 'Errore');
      }
      setCreateSuccess(tr.admin.created);
      setForm({ title: '', description: '', type: 'cena', location: '', date: '', time: '20:00', max_participants: '', rsvp_deadline: '' });
      setParts([emptyPart()]); setIsMulti(false);
      loadEvents();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Errore imprevisto');
    } finally { setCreating(false); }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Eliminare "${title}"?`)) return;
    setDeleteId(id);
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE', headers: { 'x-admin-password': password } });
      if (!res.ok && res.status === 401) { setAuthed(false); setAuthError('Password non valida.'); return; }
      loadEvents();
    } finally { setDeleteId(null); }
  }

  async function handleExportCsv(id: string, title: string) {
    setExportingId(id);
    try {
      const res = await fetch(`/api/events/${id}/export`, { headers: { 'x-admin-password': password } });
      if (!res.ok) { alert('Export fallito'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_disponibilita.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setExportingId(null); }
  }

  function updatePart(i: number, field: keyof Part, val: string) {
    setParts(ps => ps.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  }

  // ── Login ──────────────────────────────────────────────────
  if (!authed) return (
    <div className="max-w-sm mx-auto mt-16 space-y-6 animate-fadeInUp">
      <div className="text-center space-y-2">
        <div className="text-5xl">🔐</div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{tr.admin.loginTitle}</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{tr.admin.loginSubtitle}</p>
      </div>
      <form onSubmit={e => { e.preventDefault(); setAuthed(true); }} className="glass rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
            {tr.admin.passwordLabel}
          </label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoFocus />
        </div>
        {authError && <p className="text-sm rounded-xl px-3 py-2" style={{ color: '#f87171', background: 'rgba(244,63,94,0.1)' }}>{authError}</p>}
        <button type="submit" className="btn-primary w-full rounded-xl py-3 text-white font-bold text-sm">{tr.admin.loginBtn}</button>
      </form>
    </div>
  );

  // ── Dashboard ──────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{tr.admin.title}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.admin.subtitle}</p>
        </div>
        <button onClick={() => setAuthed(false)} className="text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
          {tr.admin.logout}
        </button>
      </div>

      {/* Create form */}
      <div className="glass rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{tr.admin.createTitle}</h2>
          {/* Simple / Multi toggle */}
          <div className="flex rounded-xl overflow-hidden glass">
            {[{ val: false, label: tr.admin.simpleMode }, { val: true, label: tr.admin.multiMode }].map(({ val, label }) => (
              <button key={String(val)} onClick={() => setIsMulti(val)}
                className={`px-3 py-1.5 text-xs font-semibold transition-all ${isMulti === val
                  ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white'
                  : 'text-secondary hover:opacity-80'}`}
              >{label}</button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.titleLabel}</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder={tr.admin.titlePlaceholder} required maxLength={80} />
            </div>
            {!isMulti && (
              <div>
                <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.typeLabel}</label>
                <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {eventTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            )}
            {!isMulti && (
              <div>
                <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.locationLabel}</label>
                <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder={tr.admin.locationPlaceholder} maxLength={100} />
              </div>
            )}
            <div>
              <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.dateLabel}</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                required min={new Date().toISOString().split('T')[0]} />
            </div>
            {!isMulti && (
              <div>
                <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.timeLabel}</label>
                <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} required />
              </div>
            )}
            <div>
              <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.maxLabel}</label>
              <input type="number" value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: e.target.value }))}
                placeholder={tr.admin.maxPlaceholder} min={1} max={500} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.descLabel}</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={tr.admin.descPlaceholder} rows={2} maxLength={400} style={{ resize: 'vertical' }} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                ⏰ {tr.admin.deadlineLabel}
              </label>
              <input
                type="datetime-local"
                value={form.rsvp_deadline}
                onChange={e => setForm(f => ({ ...f, rsvp_deadline: e.target.value }))}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {lang === 'it'
                  ? 'Dopo questa data/ora il form di risposta sarà bloccato.'
                  : 'After this date/time the response form will be locked.'}
              </p>
            </div>
          </div>

          {/* Parts section */}
          {isMulti && (
            <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{tr.admin.partsLabel}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{tr.admin.partsHint}</p>
              </div>
              {parts.map((part, i) => (
                <div key={i} className="glass-strong rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                      {tr.admin.partIndex} {i + 1}
                    </span>
                    {parts.length > 1 && (
                      <button type="button" onClick={() => setParts(ps => ps.filter((_, idx) => idx !== i))}
                        className="text-xs text-rose-400 hover:text-rose-300">{tr.admin.removeLabel}</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.partNameLabel}</label>
                      <input value={part.title} onChange={e => updatePart(i, 'title', e.target.value)}
                        placeholder={tr.admin.partNamePlaceholder} required={isMulti} />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.typeLabel}</label>
                      <select value={part.type} onChange={e => updatePart(i, 'type', e.target.value)}>
                        {eventTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.timeStartLabel}</label>
                      <input type="time" value={part.time} onChange={e => updatePart(i, 'time', e.target.value)} required={isMulti} />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.timeEndLabel}</label>
                      <input type="time" value={part.end_time} onChange={e => updatePart(i, 'end_time', e.target.value)} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.locationLabel}</label>
                      <input value={part.location} onChange={e => updatePart(i, 'location', e.target.value)} placeholder={tr.admin.locationPlaceholder} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.descLabel}</label>
                      <textarea value={part.description} onChange={e => updatePart(i, 'description', e.target.value)}
                        placeholder={tr.admin.descPlaceholder} rows={2} maxLength={300} style={{ resize: 'vertical' }} />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setParts(ps => [...ps, emptyPart()])}
                className="glass-strong w-full rounded-xl py-2 text-sm font-semibold transition-all hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}>
                {tr.admin.addPart}
              </button>
            </div>
          )}

          {createError && <p className="text-sm rounded-xl px-3 py-2" style={{ color: '#f87171', background: 'rgba(244,63,94,0.1)' }}>{createError}</p>}
          {createSuccess && <p className="text-sm rounded-xl px-3 py-2" style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)' }}>{createSuccess}</p>}

          <button type="submit" disabled={creating}
            className="btn-primary rounded-xl px-6 py-3 text-white font-bold text-sm disabled:opacity-50">
            {creating ? tr.admin.creating : tr.admin.createBtn}
          </button>
        </form>
      </div>

      {/* Events list */}
      <div className="space-y-3">
        <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
          {tr.admin.allEvents} ({events.length})
        </h2>
        {loadingEvents ? (
          <div className="glass rounded-2xl p-8 text-center" style={{ color: 'var(--text-muted)' }}>Caricamento...</div>
        ) : events.length === 0 ? (
          <div className="glass rounded-2xl p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>{tr.admin.noEvents}</div>
        ) : (
          <div className="space-y-2">
            {events.map(event => {
              const gradient = TYPE_COLOR[event.type] ?? 'from-violet-600 to-purple-700';
              const partsCount = (event as Event & { parts_count?: number }).parts_count ?? 0;
              const dateFormatted = new Date(event.date + 'T00:00:00').toLocaleDateString(
                lang === 'it' ? 'it-IT' : 'en-GB',
                { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
              );
              return (
                <div key={event.id} className="glass rounded-2xl overflow-hidden flex">
                  <div className={`bg-gradient-to-b ${gradient} w-1.5 shrink-0`} />
                  <div className="flex-1 px-5 py-4 flex items-center justify-between gap-4 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
                        {partsCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10" style={{ color: 'var(--text-muted)' }}>
                            🎭 {partsCount} tappe
                          </span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                        {dateFormatted}{partsCount === 0 ? ` · ${event.time}` : ''}{(partsCount === 0 && event.location) ? ` · ${event.location}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={`/event/${event.id}`} target="_blank" rel="noopener noreferrer"
                        className="text-lg opacity-50 hover:opacity-100 transition-opacity" title="Apri">🔗</a>
                      <button
                        onClick={() => handleExportCsv(event.id, event.title)}
                        disabled={exportingId === event.id}
                        className="text-xs glass-strong rounded-lg px-2.5 py-1.5 font-semibold transition-all hover:opacity-80 disabled:opacity-30"
                        style={{ color: 'var(--text-secondary)' }}
                        title={tr.admin.exportCsv}
                      >
                        {exportingId === event.id ? '⏳' : '📊'}
                      </button>
                      <button onClick={() => handleDelete(event.id, event.title)} disabled={deleteId === event.id}
                        className="text-lg opacity-50 hover:opacity-100 transition-opacity disabled:opacity-30" title="Elimina">
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
