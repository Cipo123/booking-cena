'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLang } from '@/context/providers';
import type { DatePollWithDetails, DatePollOption, DatePollVote } from '@/lib/db';
import confetti from 'canvas-confetti';

type VoteMap = Record<string, 'yes' | 'maybe' | 'no'>;

function formatDate(dateStr: string, lang: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(
    lang === 'it' ? 'it-IT' : 'en-GB',
    { weekday: 'short', day: 'numeric', month: 'short' }
  );
}

function VoteBar({ option, votes }: { option: DatePollOption; votes: DatePollVote[] }) {
  const yes   = votes.filter(v => v.status === 'yes').length;
  const maybe = votes.filter(v => v.status === 'maybe').length;
  const total = votes.length;
  const pct   = total > 0 ? Math.round((yes / total) * 100) : 0;

  return (
    <div className="space-y-1">
      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--card-bg)' }}>
        {total > 0 && (
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct >= 70 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#60a5fa',
            }}
          />
        )}
      </div>
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
        <span className="flex gap-2">
          <span className="text-emerald-400 font-semibold">✅ {yes}</span>
          <span className="text-amber-400">🤔 {maybe}</span>
        </span>
        <span>{total} {total === 1 ? 'voto' : 'voti'}</span>
      </div>
    </div>
  );
}

export default function PollPage() {
  const { id } = useParams<{ id: string }>();
  const { lang } = useLang();
  const [poll, setPoll]         = useState<DatePollWithDetails | null>(null);
  const [loading, setLoading]   = useState(true);
  const [votes, setVotes]       = useState<VoteMap>({});
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [submitting, setSubmit] = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');

  const reload = () =>
    fetch(`/api/polls/${id}`)
      .then(r => r.json())
      .then(d => { if (d.id) setPoll(d); setLoading(false); })
      .catch(() => setLoading(false));

  useEffect(() => { reload(); }, [id]);

  async function submit() {
    if (!name.trim()) {
      setError(lang === 'it' ? 'Inserisci il tuo nome' : 'Enter your name');
      return;
    }
    if (Object.keys(votes).length === 0) {
      setError(lang === 'it' ? 'Seleziona almeno una data' : 'Select at least one date');
      return;
    }
    setError('');
    setSubmit(true);
    try {
      const res = await fetch(`/api/polls/${id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ votes, user_name: name.trim(), user_email: email.trim() }),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? 'Errore'); return; }
      await reload();
      setDone(true);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#60a5fa', '#34d399', '#f59e0b'] });
    } catch {
      setError(lang === 'it' ? 'Errore, riprova.' : 'Error, retry.');
    } finally {
      setSubmit(false);
    }
  }

  if (loading) return (
    <div className="max-w-xl mx-auto space-y-3">
      {[1, 2, 3].map(i => <div key={i} className="glass rounded-2xl h-20 animate-pulse" />)}
    </div>
  );
  if (!poll) return (
    <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
      {lang === 'it' ? 'Sondaggio non trovato' : 'Poll not found'}
    </div>
  );

  // Best option = highest yes count
  const best = [...poll.options].sort((a, b) =>
    b.votes.filter(v => v.status === 'yes').length - a.votes.filter(v => v.status === 'yes').length
  )[0];

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-fadeInUp">
      <a href="/" className="inline-flex items-center gap-2 text-sm hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
        ← {lang === 'it' ? 'Torna agli eventi' : 'Back to events'}
      </a>

      {/* Header */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-5">
          <div className="text-4xl mb-2">🗳️</div>
          <h1 className="text-xl font-black text-white">{poll.title}</h1>
          {poll.description && (
            <p className="text-white/70 text-sm mt-1">{poll.description}</p>
          )}
        </div>
        {poll.closed && (
          <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'rgba(244,63,94,0.1)' }}>
            <span>🔒</span>
            <span className="text-sm font-semibold text-rose-400">
              {lang === 'it' ? 'Sondaggio chiuso' : 'Poll closed'}
            </span>
          </div>
        )}
        {!poll.closed && best && best.votes.length > 0 && (
          <div className="px-5 py-3 flex items-center gap-2 border-t" style={{ borderColor: 'var(--card-border)' }}>
            <span>🏆</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {lang === 'it' ? 'In vantaggio:' : 'Leading:'}{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{best.label}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Options */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {lang === 'it' ? '📅 Opzioni disponibili' : '📅 Available options'}
        </h3>
        {poll.options.map(opt => (
          <div key={opt.id} className="glass rounded-2xl overflow-hidden">
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {opt.label || `${formatDate(opt.date, lang)} ${opt.time}`}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(opt.date, lang)} · {opt.time}
                  </p>
                </div>
                {!poll.closed && !done && (
                  <div className="flex gap-1.5 shrink-0">
                    {(['yes', 'maybe', 'no'] as const).map(s => {
                      const icons = { yes: '✅', maybe: '🤔', no: '❌' };
                      const selected = votes[opt.id] === s;
                      const clsMap = { yes: 'btn-yes', maybe: 'btn-maybe', no: 'btn-no' };
                      return (
                        <button
                          key={s}
                          onClick={() => setVotes(v => ({ ...v, [opt.id]: s }))}
                          className={`${clsMap[s]} rounded-xl w-9 h-9 text-sm transition-all ${selected ? 'selected scale-110' : 'opacity-60 hover:opacity-100'}`}
                        >
                          {icons[s]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <VoteBar option={opt} votes={opt.votes} />
            </div>
          </div>
        ))}
      </div>

      {/* Voters list */}
      {poll.options[0]?.votes.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            {lang === 'it' ? '👤 Chi ha già votato' : '👤 Who already voted'}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(poll.options.flatMap(o => o.votes.map(v => v.user_name)))].map(u => (
              <span key={u} className="glass-strong text-xs px-2 py-1 rounded-full" style={{ color: 'var(--text-secondary)' }}>
                {u}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Vote form */}
      {!poll.closed && !done && (
        <div className="glass rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            {lang === 'it' ? '🙋 Esprimi le tue preferenze' : '🙋 Cast your vote'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={lang === 'it' ? 'Il tuo nome *' : 'Your name *'}
              maxLength={60}
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={lang === 'it' ? 'Email (opzionale)' : 'Email (optional)'}
            />
          </div>
          {error && <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>}
          <button
            onClick={submit}
            disabled={submitting}
            className="btn-primary w-full rounded-xl py-3 text-white font-bold text-sm disabled:opacity-50"
          >
            {submitting ? '⏳' : (lang === 'it' ? '🗳️ Invia preferenze' : '🗳️ Submit preferences')}
          </button>
        </div>
      )}

      {done && (
        <div className="glass rounded-2xl p-6 text-center space-y-2 animate-fadeInUp">
          <div className="text-4xl">🎉</div>
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
            {lang === 'it' ? 'Grazie per aver votato!' : 'Thanks for voting!'}
          </p>
          <button
            onClick={() => setDone(false)}
            className="text-xs underline"
            style={{ color: 'var(--text-muted)' }}
          >
            {lang === 'it' ? 'Modifica risposta' : 'Change response'}
          </button>
        </div>
      )}
    </div>
  );
}
