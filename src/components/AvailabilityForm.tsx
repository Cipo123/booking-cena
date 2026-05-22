'use client';

import { useState } from 'react';
import confetti from 'canvas-confetti';
import { useLang, useToast } from '@/context/providers';
import type { EventPart } from '@/lib/db';

type Status = 'yes' | 'maybe' | 'no';

interface Props {
  eventId: string;
  parts?: EventPart[];
  rsvpDeadline?: string | null;
  onSuccess?: () => void;
}

export default function AvailabilityForm({ eventId, parts = [], rsvpDeadline, onSuccess }: Props) {
  const { tr } = useLang();
  const { showToast } = useToast();

  const deadlinePassed = rsvpDeadline ? new Date(rsvpDeadline) < new Date() : false;

  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote]   = useState('');

  // For multi-part events: {partId: status}
  const [partSelections, setPartSelections] = useState<Record<string, Status>>({});
  // For simple events
  const [simpleStatus, setSimpleStatus] = useState<Status | null>(null);

  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  const isMulti = parts.length > 0;

  async function submit(status?: Status) {
    if (!name.trim()) { setError(isMulti ? tr.event.nameLabel.replace(' *','') + '!' : 'Inserisci il tuo nome.'); return; }
    setError('');
    setLoading(true);

    try {
      if (isMulti) {
        // Submit one call per part that has a selection
        const entries = Object.entries(partSelections);
        if (entries.length === 0) { setError('Seleziona almeno una tappa.'); setLoading(false); return; }
        await Promise.all(
          entries.map(([part_id, st]) =>
            fetch(`/api/events/${eventId}/availability`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_name: name.trim(), user_email: email.trim(), status: st, note: note.trim(), part_id }),
            }).then(r => { if (!r.ok) throw new Error(); })
          )
        );
      } else {
        const res = await fetch(`/api/events/${eventId}/availability`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_name: name.trim(), user_email: email.trim(), status, note: note.trim() }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }

      showToast(tr.toast.saved, 'success');
      setSuccess(true);
      onSuccess?.();
      // 🎉 Confetti on yes/multi-part success
      const fired = isMulti
        ? Object.values(partSelections).some(s => s === 'yes')
        : status === 'yes';
      if (fired) {
        confetti({ particleCount: 160, spread: 80, origin: { y: 0.65 }, colors: ['#60a5fa','#38bdf8','#fb923c','#34d399'] });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : tr.toast.error;
      setError(msg);
      showToast(tr.toast.error, 'error');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    const emoji = simpleStatus === 'yes' ? '🎉' : simpleStatus === 'maybe' ? '🤔' : isMulti ? '🗓️' : '😔';
    const msg = isMulti ? tr.event.successYes.replace('Perfetto, ci sei!', 'Preferenze salvate!').replace("Perfect, you're in!", 'Preferences saved!')
      : simpleStatus === 'yes' ? tr.event.successYes
      : simpleStatus === 'maybe' ? tr.event.successMaybe
      : tr.event.successNo;

    return (
      <div className="glass rounded-2xl p-6 text-center space-y-3 animate-fadeInUp">
        <div className="text-5xl">{emoji}</div>
        <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{msg}</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{tr.event.registered}, {name}.</p>
        <button
          onClick={() => { setSuccess(false); setSimpleStatus(null); setPartSelections({}); }}
          className="text-xs underline transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          {tr.event.modify}
        </button>
      </div>
    );
  }

  if (deadlinePassed) {
    return (
      <div className="glass rounded-2xl p-6 text-center space-y-2 animate-fadeInUp">
        <div className="text-4xl">🔒</div>
        <p className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{tr.event.deadlinePassed}</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{tr.event.deadlinePassedSub}</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
        <span>🙋</span> {tr.event.yourAvailability}
      </h3>

      {/* Name + email + note */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
            {tr.event.nameLabel}
          </label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={tr.event.namePlaceholder} maxLength={60} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
              {tr.event.emailLabel}
            </label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@esempio.it" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>
              {tr.event.noteLabel}
            </label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder={tr.event.notePlaceholder} maxLength={120} />
          </div>
        </div>
      </div>

      {/* Multi-part selectors */}
      {isMulti && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {tr.event.partsAvailability}
          </p>
          {parts.map(part => (
            <div key={part.id} className="glass-strong rounded-xl p-3 space-y-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {part.title} <span style={{ color: 'var(--text-muted)' }}>· {part.time}</span>
              </p>
              <div className="flex gap-2">
                {(['yes','maybe','no'] as Status[]).map(s => {
                  const labels = { yes: tr.event.yes, maybe: tr.event.maybe, no: tr.event.no };
                  const cls = { yes: 'btn-yes', maybe: 'btn-maybe', no: 'btn-no' };
                  const selected = partSelections[part.id] === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setPartSelections(prev => ({ ...prev, [part.id]: s }))}
                      className={`${cls[s]} flex-1 rounded-xl py-2 text-white text-xs font-bold transition-all ${selected ? 'selected ring-2' : 'opacity-70 hover:opacity-100'}`}
                    >
                      {labels[s]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm rounded-xl px-3 py-2" style={{ color: '#f87171', background: 'rgba(244,63,94,0.1)' }}>{error}</p>
      )}

      {/* Submit */}
      {isMulti ? (
        <button
          onClick={() => submit()}
          disabled={loading}
          className="btn-primary w-full rounded-xl py-3 text-white font-bold text-sm disabled:opacity-50"
        >
          {loading ? tr.event.submitting : tr.event.submitAll}
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          {(['yes','maybe','no'] as Status[]).map(s => {
            const labels = { yes: tr.event.yes, maybe: tr.event.maybe, no: tr.event.no };
            const emojis = { yes: '✅', maybe: '🤔', no: '❌' };
            const cls = { yes: 'btn-yes', maybe: 'btn-maybe', no: 'btn-no' };
            return (
              <button
                key={s}
                onClick={() => { setSimpleStatus(s); submit(s); }}
                disabled={loading}
                className={`${cls[s]} flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-white font-semibold text-sm disabled:opacity-50`}
              >
                {loading && simpleStatus === s ? <span className="animate-spin">⏳</span> : <span>{emojis[s]}</span>}
                {labels[s]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
