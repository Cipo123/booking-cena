'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLang } from '@/context/providers';
import LocationAutocomplete from '@/components/LocationAutocomplete';
import MapWidget from '@/components/MapWidget';
import AttendanceDonut from '@/components/AttendanceDonut';
import type { Event, EventPart, DatePoll, EventGroup } from '@/lib/db';
import { slugify } from '@/lib/utils';

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
  cena: 'from-blue-600 to-indigo-700', aperitivo: 'from-amber-500 to-orange-600',
  colazione: 'from-sky-500 to-blue-600', pizza: 'from-red-500 to-rose-600',
  festa: 'from-sky-400 to-cyan-500', altro: 'from-teal-500 to-emerald-600',
};

interface Part { id?: string; title: string; type: string; location: string; time: string; end_time: string; description: string; }
const emptyPart = (): Part => ({ title: '', type: 'aperitivo', location: '', time: '19:00', end_time: '', description: '' });

interface PollOption { label: string; date: string; time: string; }

/** Collapsible map section per event row in admin list */
function EventMapSection({ event, partsCount }: { event: Event; partsCount: number }) {
  const [open, setOpen]   = useState(false);
  const [parts, setParts] = useState<EventPart[]>([]);
  const [fetching, setFetching] = useState(false);

  const hasLocation = partsCount === 0 && !!event.location;
  const isMulti     = partsCount > 0;
  if (!hasLocation && !isMulti) return null;

  async function toggle() {
    if (!open && isMulti && parts.length === 0) {
      setFetching(true);
      try {
        const res  = await fetch(`/api/events/${event.id}`);
        const data = await res.json();
        setParts((data.parts ?? []).filter((p: EventPart) => p.location));
      } catch { /* ignore */ } finally { setFetching(false); }
    }
    setOpen(o => !o);
  }

  return (
    <div className="border-t" style={{ borderColor: 'var(--card-border)' }}>
      {hasLocation ? (
        <MapWidget location={event.location} />
      ) : (
        <>
          <button
            onClick={toggle}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-white/5 transition-colors"
          >
            <span className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span>📍</span>
              {open ? 'Nascondi mappe tappe' : 'Mostra mappe tappe'}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
          </button>
          {open && (
            <div className="animate-fadeIn">
              {fetching ? (
                <p className="px-5 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Caricamento...</p>
              ) : parts.length === 0 ? (
                <p className="px-5 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>Nessuna tappa con luogo.</p>
              ) : (
                parts.map((p, i) => (
                  <div key={p.id} className={i > 0 ? 'border-t' : ''} style={{ borderColor: 'var(--card-border)' }}>
                    <p className="px-5 pt-3 pb-1 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                      {p.title}{p.time ? ` · ${p.time}` : ''}
                    </p>
                    <MapWidget location={p.location} initialOpen={true} />
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Per-event notify panel */
function NotifyPanel({ eventId, password, lang, onClose }: {
  eventId: string; password: string; lang: string; onClose: () => void;
}) {
  const [title, setTitle] = useState(lang === 'it' ? 'Aggiornamento evento 🔔' : 'Event update 🔔');
  const [body, setBody]   = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState('');

  async function send() {
    setSending(true); setResult('');
    try {
      const res = await fetch(`/api/events/${eventId}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ title, body }),
      });
      const d = await res.json();
      if (!res.ok) { setResult(`❌ ${d.error}`); return; }
      setResult(lang === 'it' ? `✅ Inviata a ${d.sent}/${d.total} dispositivi` : `✅ Sent to ${d.sent}/${d.total} devices`);
    } catch { setResult('❌ Errore'); }
    finally { setSending(false); }
  }

  return (
    <div className="px-5 py-4 space-y-3 border-t animate-fadeIn" style={{ borderColor: 'var(--card-border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          🔔 {lang === 'it' ? 'Invia notifica push' : 'Send push notification'}
        </span>
        <button onClick={onClose} className="text-xs opacity-50 hover:opacity-100" style={{ color: 'var(--text-muted)' }}>✕</button>
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titolo" maxLength={60} />
      <input value={body}  onChange={e => setBody(e.target.value)}  placeholder={lang === 'it' ? 'Messaggio...' : 'Message...'} maxLength={120} />
      {result && <p className="text-xs" style={{ color: result.startsWith('✅') ? '#34d399' : '#f87171' }}>{result}</p>}
      <button
        onClick={send} disabled={sending}
        className="btn-primary rounded-xl px-4 py-2 text-white text-sm font-semibold disabled:opacity-50"
      >
        {sending ? '⏳' : (lang === 'it' ? '📤 Invia' : '📤 Send')}
      </button>
    </div>
  );
}

export default function AdminPage() {
  const { tr, lang } = useLang();
  const eventTypes = lang === 'it' ? EVENT_TYPES_IT : EVENT_TYPES_EN;

  const [password, setPassword]       = useState('');
  const [authed, setAuthed]           = useState(false);
  const [authError, setAuthError]     = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [events, setEvents]           = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [deleteId, setDeleteId]       = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [notifyEventId, setNotifyEventId] = useState<string | null>(null);

  // Groups
  const [groups, setGroups]           = useState<EventGroup[]>([]);
  const [groupForm, setGroupForm]     = useState({ name: '', description: '', type: 'altro', access_key: '', slug: '' });
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupError, setGroupError]   = useState('');
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  // Create/Edit form
  const [isMulti, setIsMulti]         = useState(false);
  const [parts, setParts]             = useState<Part[]>([emptyPart()]);
  const [form, setForm]               = useState({
    title: '', description: '', type: 'cena', location: '',
    date: '', time: '20:00', max_participants: '', rsvp_deadline: '', slug: '', group_id: '', meeting_point: '',
  });
  const [creating, setCreating]       = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  // Polls section
  const [polls, setPolls]             = useState<DatePoll[]>([]);
  const [pollForm, setPollForm]       = useState({ title: '', description: '' });
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { label: '', date: '', time: '19:00' },
    { label: '', date: '', time: '19:00' },
  ]);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [pollError, setPollError]     = useState('');
  const [showPollForm, setShowPollForm] = useState(false);
  const [deletingPollId, setDeletingPollId] = useState<string | null>(null);
  const [closingPollId, setClosingPollId]   = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/events', { headers: { 'x-admin-password': password } });
      if (!res.ok) { setEvents([]); return; }
      const data = await res.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch { setEvents([]); } finally { setLoadingEvents(false); }
  }, [password]);

  const loadPolls = useCallback(async () => {
    try {
      const res = await fetch('/api/polls');
      const d = await res.json();
      if (Array.isArray(d)) setPolls(d);
    } catch { /* ignore */ }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const res = await fetch('/api/groups', { headers: { 'x-admin-password': password } });
      const d = await res.json();
      if (Array.isArray(d)) setGroups(d);
    } catch { /* ignore */ }
  }, [password]);

  useEffect(() => { if (authed) { loadEvents(); loadPolls(); loadGroups(); } }, [authed, loadEvents, loadPolls, loadGroups]);

  // Auto-fill slug from title
  useEffect(() => {
    if (!editingId) {
      setForm(f => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title, editingId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(''); setCreateSuccess(''); setCreating(true);
    try {
      const body: Record<string, unknown> = {
        ...form,
        type: isMulti ? 'altro' : form.type,
        max_participants: form.max_participants ? Number(form.max_participants) : null,
        rsvp_deadline: form.rsvp_deadline || null,
        slug: form.slug || undefined,
        group_id: form.group_id || null,
        parts: isMulti ? parts : [],
      };
      const url    = editingId ? `/api/events/${editingId}` : '/api/events';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        if (res.status === 401) { setAuthed(false); setAuthError(tr.admin.wrongPassword); return; }
        throw new Error(d.error ?? 'Errore');
      }
      setCreateSuccess(editingId ? tr.admin.editSuccess : tr.admin.created);
      setForm({ title: '', description: '', type: 'cena', location: '', date: '', time: '20:00', max_participants: '', rsvp_deadline: '', slug: '', group_id: '', meeting_point: '' });
      setParts([emptyPart()]); setIsMulti(false); setEditingId(null);
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
      if (!res.ok && res.status === 401) { setAuthed(false); setAuthError(tr.admin.wrongPassword); return; }
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
      a.href = url; a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_disponibilita.csv`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExportingId(null); }
  }

  async function handleEdit(event: Event & { parts_count?: number }) {
    const partsCount = event.parts_count ?? 0;
    setCreateError(''); setCreateSuccess('');
    setEditingId(event.id);
    const multi = partsCount > 0;
    setIsMulti(multi);
    setForm({
      title: event.title,
      description: event.description,
      type: event.type,
      location: event.location,
      date: event.date,
      time: event.time,
      max_participants: event.max_participants?.toString() ?? '',
      rsvp_deadline: event.rsvp_deadline ?? '',
      slug: event.slug ?? '',
      group_id: event.group_id ?? '',
      meeting_point: event.meeting_point ?? '',
    });
    if (multi) {
      try {
        const res  = await fetch(`/api/events/${event.id}`);
        const data = await res.json();
        setParts((data.parts as EventPart[]).map(p => ({
          id: p.id, title: p.title, type: p.type,
          location: p.location, time: p.time,
          end_time: p.end_time, description: p.description,
        })));
      } catch { setParts([emptyPart()]); }
    } else { setParts([emptyPart()]); }
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  function cancelEdit() {
    setEditingId(null); setCreateError(''); setCreateSuccess('');
    setForm({ title: '', description: '', type: 'cena', location: '', date: '', time: '20:00', max_participants: '', rsvp_deadline: '', slug: '', group_id: '', meeting_point: '' });
    setParts([emptyPart()]); setIsMulti(false);
  }

  function updatePart(i: number, field: keyof Part, val: string) {
    setParts(ps => ps.map((p, idx) => idx === i ? { ...p, [field]: val } : p));
  }

  // Groups
  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    setGroupError(''); setCreatingGroup(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify(groupForm),
      });
      const d = await res.json();
      if (!res.ok) { setGroupError(d.error ?? 'Errore'); return; }
      setGroupForm({ name: '', description: '', type: 'altro', access_key: '', slug: '' });
      setShowGroupForm(false);
      loadGroups();
    } catch { setGroupError('Errore'); }
    finally { setCreatingGroup(false); }
  }

  async function handleDeleteGroup(id: string, name: string) {
    if (!confirm(`Eliminare il gruppo "${name}"? Gli eventi non verranno eliminati.`)) return;
    setDeletingGroupId(id);
    try {
      await fetch(`/api/groups/${id}`, { method: 'DELETE', headers: { 'x-admin-password': password } });
      loadGroups();
    } finally { setDeletingGroupId(null); }
  }

  // Polls
  async function handleCreatePoll(e: React.FormEvent) {
    e.preventDefault();
    setPollError(''); setCreatingPoll(true);
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ ...pollForm, options: pollOptions.filter(o => o.date) }),
      });
      const d = await res.json();
      if (!res.ok) { setPollError(d.error ?? 'Errore'); return; }
      setPollForm({ title: '', description: '' });
      setPollOptions([{ label: '', date: '', time: '19:00' }, { label: '', date: '', time: '19:00' }]);
      setShowPollForm(false);
      loadPolls();
    } catch { setPollError('Errore'); }
    finally { setCreatingPoll(false); }
  }

  async function handleDeletePoll(id: string) {
    if (!confirm('Eliminare questo sondaggio?')) return;
    setDeletingPollId(id);
    try {
      await fetch(`/api/polls/${id}`, { method: 'DELETE', headers: { 'x-admin-password': password } });
      loadPolls();
    } finally { setDeletingPollId(null); }
  }

  async function handleClosePoll(id: string) {
    setClosingPollId(id);
    try {
      await fetch(`/api/polls/${id}/close`, { method: 'POST', headers: { 'x-admin-password': password } });
      loadPolls();
    } finally { setClosingPollId(null); }
  }

  // ── Login ──────────────────────────────────────────────────
  if (!authed) return (
    <div className="max-w-sm mx-auto mt-16 space-y-6 animate-fadeInUp">
      <div className="text-center space-y-2">
        <div className="text-5xl">🔐</div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{tr.admin.loginTitle}</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{tr.admin.loginSubtitle}</p>
      </div>
      <form
        onSubmit={async e => {
          e.preventDefault(); setAuthError(''); setLoginLoading(true);
          try {
            const res = await fetch('/api/admin/auth', { headers: { 'x-admin-password': password } });
            if (res.ok) setAuthed(true);
            else setAuthError(tr.admin.wrongPassword);
          } catch { setAuthError(tr.admin.wrongPassword); }
          finally { setLoginLoading(false); }
        }}
        className="glass rounded-2xl p-6 space-y-4"
      >
        <div>
          <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.passwordLabel}</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required autoFocus />
        </div>
        {authError && <p className="text-sm rounded-xl px-3 py-2" style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}>{authError}</p>}
        <button type="submit" disabled={loginLoading} className="btn-primary w-full rounded-xl py-3 text-white font-bold text-sm disabled:opacity-60">
          {loginLoading ? '⏳ Verifica...' : tr.admin.loginBtn}
        </button>
      </form>
    </div>
  );

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // ── Dashboard ──────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-fadeInUp">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{tr.admin.title}</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{tr.admin.subtitle}</p>
        </div>
        <button onClick={() => setAuthed(false)} className="text-sm" style={{ color: 'var(--text-muted)' }}>{tr.admin.logout}</button>
      </div>

      {/* ── Create / Edit form ─────────────────────────────── */}
      <div ref={formRef} className="glass rounded-2xl p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            {editingId ? tr.admin.editTitle : tr.admin.createTitle}
          </h2>
          <div className="flex rounded-xl overflow-hidden glass">
            {[{ val: false, label: tr.admin.simpleMode }, { val: true, label: tr.admin.multiMode }].map(({ val, label }) => (
              <button key={String(val)} onClick={() => setIsMulti(val)}
                className={`px-3 py-1.5 text-xs font-semibold transition-all ${isMulti === val
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white'
                  : 'opacity-60 hover:opacity-80'}`}
                style={!(isMulti === val) ? { color: 'var(--text-secondary)' } : {}}
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

            {/* Slug field */}
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                🔗 {lang === 'it' ? 'URL personalizzato (slug)' : 'Custom URL (slug)'}
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>/e/</span>
                <input
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: slugify(e.target.value) }))}
                  placeholder={lang === 'it' ? 'cena-da-marco' : 'group-dinner'}
                  maxLength={60}
                  className="flex-1"
                />
                {form.slug && (
                  <span className="text-xs shrink-0 font-mono truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>
                    {origin}/e/{form.slug}
                  </span>
                )}
              </div>
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
                <LocationAutocomplete value={form.location} onChange={v => setForm(f => ({ ...f, location: v }))} placeholder={tr.admin.locationPlaceholder} />
              </div>
            )}
            <div className={!isMulti ? '' : 'sm:col-span-2'}>
              <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                🚩 {lang === 'it' ? 'Punto di ritrovo (opzionale)' : 'Meeting point (optional)'}
              </label>
              <LocationAutocomplete
                value={form.meeting_point}
                onChange={v => setForm(f => ({ ...f, meeting_point: v }))}
                placeholder={lang === 'it' ? 'Es. Piazza Duomo, Milano' : 'E.g. Times Square, New York'}
              />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {lang === 'it'
                  ? 'Luogo da cui la comitiva parte — verrà mostrato con mappa sulla pagina evento.'
                  : 'The gathering spot before heading out — shown with a map on the event page.'}
              </p>
            </div>
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
              <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>⏰ {tr.admin.deadlineLabel}</label>
              <input type="datetime-local" value={form.rsvp_deadline} onChange={e => setForm(f => ({ ...f, rsvp_deadline: e.target.value }))} />
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {lang === 'it' ? 'Dopo questa data/ora il form di risposta sarà bloccato.' : 'After this date/time the response form will be locked.'}
              </p>
            </div>

            {groups.length > 0 && (
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  👥 {lang === 'it' ? 'Gruppo (opzionale)' : 'Group (optional)'}
                </label>
                <select value={form.group_id} onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))}>
                  <option value="">{lang === 'it' ? '— Nessun gruppo —' : '— No group —'}</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
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
                      <LocationAutocomplete value={part.location} onChange={v => updatePart(i, 'location', v)} placeholder={tr.admin.locationPlaceholder} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{tr.admin.descLabel}</label>
                      <textarea value={part.description} onChange={e => updatePart(i, 'description', e.target.value)}
                        placeholder={tr.admin.descPlaceholder} rows={2} maxLength={300} style={{ resize: 'vertical' }} />
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setParts(ps => {
                const prev = ps[ps.length - 1];
                const defaultTime = prev?.end_time || prev?.time || '19:00';
                return [...ps, { ...emptyPart(), time: defaultTime }];
              })}
                className="glass-strong w-full rounded-xl py-2 text-sm font-semibold transition-all hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}>
                {tr.admin.addPart}
              </button>
            </div>
          )}

          {createError   && <p className="text-sm rounded-xl px-3 py-2" style={{ color: '#f87171', background: 'rgba(239,68,68,0.1)' }}>{createError}</p>}
          {createSuccess && <p className="text-sm rounded-xl px-3 py-2" style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)' }}>{createSuccess}</p>}

          <div className="flex items-center gap-3 flex-wrap">
            <button type="submit" disabled={creating}
              className="btn-primary rounded-xl px-6 py-3 text-white font-bold text-sm disabled:opacity-50">
              {creating ? (editingId ? tr.admin.editing : tr.admin.creating) : (editingId ? tr.admin.editBtn : tr.admin.createBtn)}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit}
                className="glass-strong rounded-xl px-4 py-3 text-sm font-semibold hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}>{tr.admin.cancelEdit}</button>
            )}
          </div>
        </form>
      </div>

      {/* ── Events list ────────────────────────────────────── */}
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
              const gradient   = TYPE_COLOR[event.type] ?? 'from-blue-600 to-indigo-700';
              const partsCount = event.parts_count ?? 0;
              const dateFormatted = new Date(event.date + 'T00:00:00').toLocaleDateString(
                lang === 'it' ? 'it-IT' : 'en-GB',
                { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }
              );
              const yesC   = event.yes_count   ?? 0;
              const maybeC = event.maybe_count ?? 0;
              const noC    = event.no_count    ?? 0;
              return (
                <div key={event.id}
                  className="glass rounded-2xl overflow-hidden transition-all"
                  style={editingId === event.id ? { boxShadow: '0 0 0 2px #60a5fa' } : {}}
                >
                  <div className="flex">
                    <div className={`bg-gradient-to-b ${gradient} w-1.5 shrink-0`} />
                    <div className="flex-1 px-4 py-3 flex items-center justify-between gap-3 min-w-0">
                      {/* Left: info + donut */}
                      <div className="flex items-center gap-3 min-w-0">
                        {partsCount === 0 && (
                          <AttendanceDonut yes={yesC} maybe={maybeC} no={noC} size={52} />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate text-sm" style={{ color: 'var(--text-primary)' }}>{event.title}</p>
                            {partsCount > 0 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 shrink-0" style={{ color: 'var(--text-muted)' }}>
                                🎭 {partsCount}
                              </span>
                            )}
                          </div>
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                            {dateFormatted}{partsCount === 0 ? ` · ${event.time}` : ''}
                            {event.slug && <span className="ml-1 font-mono opacity-60"> /e/{event.slug}</span>}
                          </p>
                          {partsCount === 0 && (
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs text-emerald-400 font-semibold">✅ {yesC}</span>
                              <span className="text-xs text-amber-400">🤔 {maybeC}</span>
                              <span className="text-xs text-rose-400">❌ {noC}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Right: actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <a href={event.slug ? `/e/${event.slug}` : `/event/${event.id}`}
                          target="_blank" rel="noopener noreferrer"
                          className="p-2 text-base opacity-50 hover:opacity-100 transition-opacity rounded-lg" title="Apri">🔗</a>
                        <button onClick={() => handleEdit(event)}
                          className={`p-2 text-base rounded-lg transition-opacity ${editingId === event.id ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
                          title="Modifica">✏️</button>
                        <button
                          onClick={() => setNotifyEventId(n => n === event.id ? null : event.id)}
                          className={`p-2 text-base rounded-lg transition-opacity ${notifyEventId === event.id ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
                          title={lang === 'it' ? 'Notifica push' : 'Push notify'}>🔔</button>
                        <button onClick={() => handleExportCsv(event.id, event.title)} disabled={exportingId === event.id}
                          className="p-2 text-base glass-strong rounded-lg transition-all hover:opacity-80 disabled:opacity-30"
                          style={{ color: 'var(--text-secondary)' }} title={tr.admin.exportCsv}>
                          {exportingId === event.id ? '⏳' : '📊'}
                        </button>
                        <button onClick={() => handleDelete(event.id, event.title)} disabled={deleteId === event.id}
                          className="p-2 text-base opacity-50 hover:opacity-100 transition-opacity disabled:opacity-30 rounded-lg" title="Elimina">
                          {deleteId === event.id ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    </div>
                  </div>
                  {notifyEventId === event.id && (
                    <NotifyPanel eventId={event.id} password={password} lang={lang} onClose={() => setNotifyEventId(null)} />
                  )}
                  <EventMapSection event={event} partsCount={partsCount} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Groups section ─────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            👥 {lang === 'it' ? `Gruppi (${groups.length})` : `Groups (${groups.length})`}
          </h2>
          <button
            onClick={() => setShowGroupForm(v => !v)}
            className="btn-primary rounded-xl px-4 py-2 text-white text-sm font-semibold"
          >
            {showGroupForm ? '✕' : `+ ${lang === 'it' ? 'Nuovo gruppo' : 'New group'}`}
          </button>
        </div>

        {showGroupForm && (
          <form onSubmit={handleCreateGroup} className="glass rounded-2xl p-5 space-y-4 animate-fadeInUp">
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              ➕ {lang === 'it' ? 'Crea gruppo' : 'Create group'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  {lang === 'it' ? 'Nome *' : 'Name *'}
                </label>
                <input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value, slug: f.slug || e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                  placeholder={lang === 'it' ? 'Es. Corso Marketing 2024' : 'E.g. Marketing Course 2024'}
                  required maxLength={80} />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  {lang === 'it' ? 'Tipo' : 'Type'}
                </label>
                <select value={groupForm.type} onChange={e => setGroupForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="corso">🎓 Corso</option>
                  <option value="progetto">💼 Progetto</option>
                  <option value="compagnia">👥 Compagnia</option>
                  <option value="altro">🏷️ Altro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  🔑 {lang === 'it' ? 'Chiave di accesso *' : 'Access key *'}
                </label>
                <input value={groupForm.access_key} onChange={e => setGroupForm(f => ({ ...f, access_key: e.target.value }))}
                  placeholder={lang === 'it' ? 'Es. corso2024' : 'E.g. course2024'}
                  required maxLength={80} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  {lang === 'it' ? 'Descrizione (opzionale)' : 'Description (optional)'}
                </label>
                <input value={groupForm.description} onChange={e => setGroupForm(f => ({ ...f, description: e.target.value }))}
                  placeholder={lang === 'it' ? 'Breve descrizione...' : 'Short description...'}
                  maxLength={200} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs uppercase tracking-wide font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  🔗 {lang === 'it' ? 'URL gruppo (slug)' : 'Group URL (slug)'}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>/g/</span>
                  <input value={groupForm.slug} onChange={e => setGroupForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    placeholder={lang === 'it' ? 'es. corso-marketing' : 'e.g. marketing-course'}
                    maxLength={60} className="flex-1" />
                </div>
              </div>
            </div>
            {groupError && <p className="text-sm" style={{ color: '#f87171' }}>{groupError}</p>}
            <button type="submit" disabled={creatingGroup}
              className="btn-primary rounded-xl px-6 py-3 text-white font-bold text-sm disabled:opacity-50">
              {creatingGroup ? '⏳' : (lang === 'it' ? '✨ Crea gruppo' : '✨ Create group')}
            </button>
          </form>
        )}

        {groups.length > 0 ? (
          <div className="space-y-2">
            {groups.map(group => (
              <div key={group.id} className="glass rounded-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{group.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--card-bg)', color: 'var(--text-muted)' }}>
                        {group.type}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>
                        {group.events_count ?? 0} eventi
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                      /g/{group.slug} · 🔑 {group.access_key}
                    </p>
                    {group.description && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{group.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={`/g/${group.slug}`} target="_blank" rel="noopener noreferrer"
                      className="p-2 text-base opacity-50 hover:opacity-100 rounded-lg" title="Apri">🔗</a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${origin}/g/${group.slug}`).catch(() => {});
                      }}
                      className="p-2 text-base opacity-50 hover:opacity-100 rounded-lg" title="Copia link">📋</button>
                    <button onClick={() => handleDeleteGroup(group.id, group.name)} disabled={deletingGroupId === group.id}
                      className="p-2 text-base opacity-50 hover:opacity-100 rounded-lg">
                      {deletingGroupId === group.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showGroupForm && (
            <div className="glass rounded-2xl p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {lang === 'it' ? 'Nessun gruppo ancora. Creane uno per raggruppare gli eventi!' : 'No groups yet. Create one to group events!'}
            </div>
          )
        )}
      </div>

      {/* ── Polls section ──────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
            🗳️ {lang === 'it' ? `Sondaggi data (${polls.length})` : `Date polls (${polls.length})`}
          </h2>
          <button
            onClick={() => setShowPollForm(v => !v)}
            className="btn-primary rounded-xl px-4 py-2 text-white text-sm font-semibold"
          >
            {showPollForm ? '✕' : '+ ' + (lang === 'it' ? 'Nuovo sondaggio' : 'New poll')}
          </button>
        </div>

        {/* Create poll form */}
        {showPollForm && (
          <form onSubmit={handleCreatePoll} className="glass rounded-2xl p-5 space-y-4 animate-fadeInUp">
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {lang === 'it' ? '➕ Crea sondaggio data' : '➕ Create date poll'}
            </h3>
            <input
              value={pollForm.title}
              onChange={e => setPollForm(f => ({ ...f, title: e.target.value }))}
              placeholder={lang === 'it' ? 'Titolo sondaggio *' : 'Poll title *'}
              required maxLength={80}
            />
            <input
              value={pollForm.description}
              onChange={e => setPollForm(f => ({ ...f, description: e.target.value }))}
              placeholder={lang === 'it' ? 'Descrizione (opzionale)' : 'Description (optional)'}
              maxLength={200}
            />
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                {lang === 'it' ? 'Opzioni data (min 2)' : 'Date options (min 2)'}
              </p>
              {pollOptions.map((opt, i) => (
                <div key={i} className="glass-strong rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                      {lang === 'it' ? `Opzione ${i + 1}` : `Option ${i + 1}`}
                    </span>
                    {pollOptions.length > 2 && (
                      <button type="button" onClick={() => setPollOptions(o => o.filter((_, idx) => idx !== i))}
                        className="text-xs text-rose-400">✕</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="date"
                      value={opt.date}
                      onChange={e => setPollOptions(o => o.map((x, idx) => idx === i ? { ...x, date: e.target.value } : x))}
                      required
                    />
                    <input
                      type="time"
                      value={opt.time}
                      onChange={e => setPollOptions(o => o.map((x, idx) => idx === i ? { ...x, time: e.target.value } : x))}
                    />
                    <input
                      value={opt.label}
                      onChange={e => setPollOptions(o => o.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x))}
                      placeholder={lang === 'it' ? 'Etichetta (opz.)' : 'Label (opt.)'}
                      maxLength={60}
                    />
                  </div>
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button type="button"
                  onClick={() => setPollOptions(o => [...o, { label: '', date: '', time: '19:00' }])}
                  className="glass-strong w-full rounded-xl py-2 text-sm font-semibold hover:opacity-80"
                  style={{ color: 'var(--text-secondary)' }}>
                  + {lang === 'it' ? 'Aggiungi opzione' : 'Add option'}
                </button>
              )}
            </div>
            {pollError && <p className="text-sm" style={{ color: '#f87171' }}>{pollError}</p>}
            <button type="submit" disabled={creatingPoll}
              className="btn-primary rounded-xl px-6 py-3 text-white font-bold text-sm disabled:opacity-50">
              {creatingPoll ? '⏳' : (lang === 'it' ? '✨ Crea sondaggio' : '✨ Create poll')}
            </button>
          </form>
        )}

        {/* Polls list */}
        {polls.length > 0 ? (
          <div className="space-y-2">
            {polls.map(poll => (
              <div key={poll.id} className="glass rounded-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{poll.title}</p>
                      {poll.closed && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(244,63,94,0.15)', color: '#f87171' }}>
                          🔒 {lang === 'it' ? 'chiuso' : 'closed'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
                      {origin}/poll/{poll.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={`/poll/${poll.id}`} target="_blank" rel="noopener noreferrer"
                      className="p-2 text-base opacity-50 hover:opacity-100 rounded-lg" title="Apri">🔗</a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${origin}/poll/${poll.id}`).catch(() => {});
                      }}
                      className="p-2 text-base opacity-50 hover:opacity-100 rounded-lg" title={lang === 'it' ? 'Copia link' : 'Copy link'}>📋</button>
                    {!poll.closed && (
                      <button onClick={() => handleClosePoll(poll.id)} disabled={closingPollId === poll.id}
                        className="p-2 text-base opacity-50 hover:opacity-100 rounded-lg" title={lang === 'it' ? 'Chiudi sondaggio' : 'Close poll'}>
                        {closingPollId === poll.id ? '⏳' : '🔒'}
                      </button>
                    )}
                    <button onClick={() => handleDeletePoll(poll.id)} disabled={deletingPollId === poll.id}
                      className="p-2 text-base opacity-50 hover:opacity-100 rounded-lg">
                      {deletingPollId === poll.id ? '⏳' : '🗑️'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showPollForm && (
            <div className="glass rounded-2xl p-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {lang === 'it' ? 'Nessun sondaggio ancora. Creane uno!' : 'No polls yet. Create one!'}
            </div>
          )
        )}
      </div>
    </div>
  );
}
