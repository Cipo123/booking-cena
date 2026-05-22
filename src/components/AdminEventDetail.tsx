'use client';

import { useEffect, useState, useCallback } from 'react';
import AttendanceDonut from './AttendanceDonut';
import type { EventWithAvailabilities, Availability, EventComment, EventPhoto, EventPart } from '@/lib/db';

interface Props {
  eventId: string;
  password: string;
  lang: string;
  onClose: () => void;
}

type Tab = 'presenze' | 'commenti' | 'foto';
type Status = 'yes' | 'maybe' | 'no';

const STATUS_LABEL: Record<string, string> = { yes: '✅ Sì', maybe: '🤔 Forse', no: '❌ No' };
const STATUS_COLOR: Record<string, string> = { yes: '#34d399', maybe: '#fbbf24', no: '#f87171' };

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function KpiCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="glass rounded-2xl px-4 py-3 space-y-0.5 min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-black" style={{ color: color ?? 'var(--text-primary)' }}>{value}</p>
      {sub && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
    </div>
  );
}

export default function AdminEventDetail({ eventId, password, lang, onClose }: Props) {
  const [event, setEvent]       = useState<EventWithAvailabilities | null>(null);
  const [comments, setComments] = useState<EventComment[]>([]);
  const [photos, setPhotos]     = useState<EventPhoto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [tab, setTab]           = useState<Tab>('presenze');

  // Add availability form
  const [addName, setAddName]       = useState('');
  const [addEmail, setAddEmail]     = useState('');
  const [addStatus, setAddStatus]   = useState<Status>('yes');
  const [addNote, setAddNote]       = useState('');
  const [addPartId, setAddPartId]   = useState('');
  const [adding, setAdding]         = useState(false);
  const [addError, setAddError]     = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Delete states
  const [deletingAvail, setDeletingAvail]     = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState<string | null>(null);
  const [deletingPhoto, setDeletingPhoto]     = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const [evRes, commRes, photRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/comments`),
        fetch(`/api/events/${eventId}/photos`),
      ]);
      const [evData, commData, photData] = await Promise.all([
        evRes.json(), commRes.json(), photRes.json(),
      ]);
      if (evData?.id) setEvent(evData);
      if (Array.isArray(commData)) setComments(commData);
      if (Array.isArray(photData)) setPhotos(photData);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { reload(); }, [reload]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  async function handleDeleteAvail(id: string) {
    setDeletingAvail(id);
    await fetch(`/api/events/${eventId}/availability`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ avail_id: id }),
    });
    setDeletingAvail(null);
    reload();
  }

  async function handleAddAvail(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) { setAddError('Nome obbligatorio'); return; }
    setAdding(true); setAddError(''); setAddSuccess('');
    const res = await fetch(`/api/events/${eventId}/availability`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({
        user_name: addName.trim(),
        user_email: addEmail.trim(),
        status: addStatus,
        note: addNote.trim(),
        part_id: addPartId || null,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setAddError(d.error ?? 'Errore');
    } else {
      setAddName(''); setAddEmail(''); setAddNote(''); setAddPartId(''); setAddStatus('yes');
      setAddSuccess('Risposta aggiunta!');
      setTimeout(() => setAddSuccess(''), 2500);
      reload();
    }
    setAdding(false);
  }

  async function handleDeleteComment(id: string) {
    setDeletingComment(id);
    await fetch(`/api/events/${eventId}/comments`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ comment_id: id }),
    });
    setDeletingComment(null);
    reload();
  }

  async function handleDeletePhoto(id: string) {
    if (!confirm('Eliminare questa foto?')) return;
    setDeletingPhoto(id);
    await fetch(`/api/events/${eventId}/photos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
      body: JSON.stringify({ photo_id: id }),
    });
    setDeletingPhoto(null);
    reload();
  }

  // ── Derived stats ──
  const avails     = event?.availabilities ?? [];
  const parts      = event?.parts ?? [];
  const isMulti    = parts.length > 0;
  const eventLevel = avails.filter(a => !a.part_id);
  const yes        = avails.filter(a => a.status === 'yes' && !a.part_id).length;
  const maybe      = avails.filter(a => a.status === 'maybe' && !a.part_id).length;
  const no         = avails.filter(a => a.status === 'no' && !a.part_id).length;
  const total      = eventLevel.length;
  const maxP       = event?.max_participants ?? null;
  const pct        = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  // For multi: aggregate across all parts
  const multiYes   = avails.filter(a => a.status === 'yes' && a.part_id).length;
  const multiMaybe = avails.filter(a => a.status === 'maybe' && a.part_id).length;
  const multiNo    = avails.filter(a => a.status === 'no' && a.part_id).length;

  function partAvails(partId: string) {
    return avails.filter(a => a.part_id === partId);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: 'linear-gradient(135deg, var(--bg-from) 0%, var(--bg-via) 50%, var(--bg-to) 100%)' }}
    >
      {/* ── Top bar ── */}
      <div
        className="flex items-center gap-4 px-5 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
      >
        <button
          onClick={onClose}
          className="glass-strong rounded-xl px-3 py-2 text-sm font-semibold transition-opacity hover:opacity-80 shrink-0"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← {lang === 'it' ? 'Torna alla dashboard' : 'Back to dashboard'}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-black text-base truncate" style={{ color: 'var(--text-primary)' }}>
            {loading ? '…' : event?.title}
          </p>
          {event && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {new Date(event.date + 'T00:00:00').toLocaleDateString(lang === 'it' ? 'it-IT' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {!isMulti && ` · ${event.time}`}
            </p>
          )}
        </div>
        <button
          onClick={reload}
          className="glass-strong rounded-xl px-3 py-2 text-sm transition-opacity hover:opacity-80 shrink-0"
          style={{ color: 'var(--text-muted)' }}
          title="Aggiorna"
        >🔄</button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-3 w-full max-w-2xl px-5">
            {[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-20 animate-pulse" />)}
          </div>
        </div>
      ) : !event ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
          Evento non trovato
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-5 py-6 space-y-6">

            {/* ── KPI cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {isMulti ? (
                <>
                  <KpiCard label="Totale risposte" value={avails.length} />
                  <KpiCard label="✅ Sì" value={multiYes} color="#34d399" />
                  <KpiCard label="🤔 Forse" value={multiMaybe} color="#fbbf24" />
                  <KpiCard label="❌ No" value={multiNo} color="#f87171" />
                </>
              ) : (
                <>
                  <KpiCard label="Risposte" value={total} />
                  <KpiCard label="✅ Sì" value={yes} sub={`${pct(yes)}%`} color="#34d399" />
                  <KpiCard label="🤔 Forse" value={maybe} sub={`${pct(maybe)}%`} color="#fbbf24" />
                  <KpiCard label="❌ No" value={no} sub={`${pct(no)}%`} color="#f87171" />
                </>
              )}
            </div>

            {/* Capacity + donut (simple event only) */}
            {!isMulti && (
              <div className="glass rounded-2xl p-5 flex items-center gap-6 flex-wrap">
                <AttendanceDonut yes={yes} maybe={maybe} no={no} size={96} />
                <div className="space-y-1.5 flex-1 min-w-0">
                  {[
                    { label: '✅ Sì', n: yes, color: '#34d399' },
                    { label: '🤔 Forse', n: maybe, color: '#fbbf24' },
                    { label: '❌ No', n: no, color: '#f87171' },
                  ].map(({ label, n, color }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className="h-2 rounded-full flex-1" style={{ background: 'var(--card-bg)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct(n)}%`, background: color }} />
                      </div>
                      <span className="text-xs font-semibold w-16 text-right" style={{ color }}>{label}: {n}</span>
                    </div>
                  ))}
                  {maxP && (
                    <p className="text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                      🎯 Posti: {yes}/{maxP} ({Math.round((yes / maxP) * 100)}% occupato)
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Multi-part KPI per tappa */}
            {isMulti && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Riepilogo per tappa
                </p>
                <div className="space-y-2">
                  {parts.map(part => {
                    const pa = partAvails(part.id);
                    const py = pa.filter(a => a.status === 'yes').length;
                    const pm = pa.filter(a => a.status === 'maybe').length;
                    const pn = pa.filter(a => a.status === 'no').length;
                    return (
                      <div key={part.id} className="glass rounded-2xl px-4 py-3 flex items-center gap-4 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                            {part.title} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>· {part.time}</span>
                          </p>
                        </div>
                        <div className="flex gap-3 shrink-0">
                          <span className="text-sm font-bold" style={{ color: '#34d399' }}>✅ {py}</span>
                          <span className="text-sm font-bold" style={{ color: '#fbbf24' }}>🤔 {pm}</span>
                          <span className="text-sm font-bold" style={{ color: '#f87171' }}>❌ {pn}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>/ {pa.length} tot.</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Tab bar ── */}
            <div className="flex rounded-2xl overflow-hidden glass">
              {([
                { key: 'presenze', label: `🙋 Presenze (${avails.length})` },
                { key: 'commenti', label: `💬 Bacheca (${comments.length})` },
                { key: 'foto',     label: `🖼️ Foto (${photos.length})` },
              ] as { key: Tab; label: string }[]).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 py-3 text-xs font-semibold transition-all ${tab === key ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white' : 'opacity-60 hover:opacity-80'}`}
                  style={tab !== key ? { color: 'var(--text-secondary)' } : {}}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── PRESENZE tab ── */}
            {tab === 'presenze' && (
              <div className="space-y-4">

                {/* Add form */}
                <div className="glass rounded-2xl p-5 space-y-3">
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    ➕ Aggiungi risposta manuale
                  </p>
                  <form onSubmit={handleAddAvail} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input value={addName} onChange={e => setAddName(e.target.value)}
                        placeholder="Nome *" maxLength={60} required />
                      <input type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)}
                        placeholder="Email (opzionale)" />
                      <input value={addNote} onChange={e => setAddNote(e.target.value)}
                        placeholder="Nota (opzionale)" maxLength={120} />
                      <div className="flex gap-2">
                        <select
                          value={addStatus}
                          onChange={e => setAddStatus(e.target.value as Status)}
                          className="flex-1"
                        >
                          <option value="yes">✅ Sì</option>
                          <option value="maybe">🤔 Forse</option>
                          <option value="no">❌ No</option>
                        </select>
                        {isMulti && (
                          <select
                            value={addPartId}
                            onChange={e => setAddPartId(e.target.value)}
                            className="flex-1"
                          >
                            <option value="">— Tappa —</option>
                            {parts.map(p => (
                              <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                    {addError && <p className="text-xs text-rose-400">{addError}</p>}
                    {addSuccess && <p className="text-xs text-emerald-400">{addSuccess}</p>}
                    <button type="submit" disabled={adding}
                      className="btn-primary rounded-xl px-5 py-2.5 text-white text-sm font-semibold disabled:opacity-50">
                      {adding ? '⏳' : '➕ Aggiungi'}
                    </button>
                  </form>
                </div>

                {/* Attendees list */}
                {isMulti ? (
                  // Multi-part: show per part
                  parts.map(part => {
                    const pa = partAvails(part.id);
                    if (pa.length === 0) return (
                      <div key={part.id} className="glass rounded-2xl px-4 py-3">
                        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                          {part.title} <span style={{ color: 'var(--text-muted)' }}>· {part.time}</span>
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nessuna risposta</p>
                      </div>
                    );
                    return (
                      <div key={part.id} className="glass rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--card-border)' }}>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {part.title} <span style={{ color: 'var(--text-muted)' }}>· {part.time}</span>
                          </p>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pa.length} risposte</span>
                        </div>
                        <AvailTable avails={pa} onDelete={handleDeleteAvail} deletingId={deletingAvail} />
                      </div>
                    );
                  })
                ) : (
                  // Simple event
                  eventLevel.length === 0 ? (
                    <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                      Nessuna risposta ancora.
                    </p>
                  ) : (
                    <div className="glass rounded-2xl overflow-hidden">
                      <AvailTable avails={eventLevel} onDelete={handleDeleteAvail} deletingId={deletingAvail} />
                    </div>
                  )
                )}
              </div>
            )}

            {/* ── COMMENTI tab ── */}
            {tab === 'commenti' && (
              <div className="space-y-2">
                {comments.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    Nessun messaggio in bacheca.
                  </p>
                ) : (
                  comments.map(c => (
                    <div key={c.id} className="glass rounded-2xl px-4 py-3 flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{c.user_name}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmt(c.created_at)}</span>
                        </div>
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{c.message}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        disabled={deletingComment === c.id}
                        className="shrink-0 text-base opacity-40 hover:opacity-100 transition-opacity disabled:opacity-20 p-1 rounded-lg"
                        title="Elimina"
                      >
                        {deletingComment === c.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── FOTO tab ── */}
            {tab === 'foto' && (
              <div className="space-y-4">
                <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
                  <span className="text-2xl">🖼️</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {photos.length} {photos.length === 1 ? 'foto caricata' : 'foto caricate'}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Archiviate su Supabase Storage
                    </p>
                  </div>
                </div>
                {photos.length === 0 ? (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                    Nessuna foto caricata.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photos.map(p => (
                      <div key={p.id} className="glass rounded-2xl overflow-hidden group relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={p.url}
                          alt={`Foto di ${p.uploader_name}`}
                          className="w-full aspect-square object-cover"
                        />
                        <div className="px-3 py-2 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                              {p.uploader_name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmt(p.created_at)}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a href={p.url} target="_blank" rel="noopener noreferrer"
                              className="text-base opacity-40 hover:opacity-100 transition-opacity p-1 rounded"
                              title="Apri originale">🔗</a>
                            <button
                              onClick={() => handleDeletePhoto(p.id)}
                              disabled={deletingPhoto === p.id}
                              className="text-base opacity-40 hover:opacity-100 transition-opacity disabled:opacity-20 p-1 rounded"
                              title="Elimina"
                            >
                              {deletingPhoto === p.id ? '⏳' : '🗑️'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

/* ── Attendees table ── */
function AvailTable({ avails, onDelete, deletingId }: {
  avails: Availability[];
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const sorted = [...avails].sort((a, b) => {
    const order: Record<string, number> = { yes: 0, maybe: 1, no: 2 };
    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
  });

  return (
    <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
      {sorted.map(a => (
        <div key={a.id} className="px-4 py-3 flex items-start gap-3">
          <span
            className="shrink-0 text-xs font-bold px-2 py-1 rounded-full mt-0.5"
            style={{
              background: `${STATUS_COLOR[a.status]}22`,
              color: STATUS_COLOR[a.status],
            }}
          >
            {STATUS_LABEL[a.status]}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{a.user_name}</p>
            {a.user_email && (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{a.user_email}</p>
            )}
            {a.note && (
              <p className="text-xs italic mt-0.5" style={{ color: 'var(--text-muted)' }}>"{a.note}"</p>
            )}
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmt(a.created_at)}</p>
          </div>
          <button
            onClick={() => onDelete(a.id)}
            disabled={deletingId === a.id}
            className="shrink-0 text-base opacity-40 hover:opacity-100 transition-opacity disabled:opacity-20 p-1 rounded-lg"
            title="Elimina risposta"
          >
            {deletingId === a.id ? '⏳' : '🗑️'}
          </button>
        </div>
      ))}
    </div>
  );
}
