'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Status = 'yes' | 'maybe' | 'no';

const BUTTONS: { status: Status; label: string; emoji: string; cls: string }[] = [
  { status: 'yes', label: 'Ci sono!', emoji: '✅', cls: 'btn-yes' },
  { status: 'maybe', label: 'Forse', emoji: '🤔', cls: 'btn-maybe' },
  { status: 'no', label: 'Non posso', emoji: '❌', cls: 'btn-no' },
];

export default function AvailabilityForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(status: Status) {
    if (!name.trim()) {
      setError('Inserisci il tuo nome prima di confermare.');
      return;
    }
    setError('');
    setLoading(true);
    setSelected(status);

    try {
      const res = await fetch(`/api/events/${eventId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: name.trim(),
          user_email: email.trim(),
          status,
          note: note.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Errore');
      }

      setSuccess(true);
      router.refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Errore imprevisto');
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    const btn = BUTTONS.find((b) => b.status === selected);
    return (
      <div className="glass rounded-2xl p-6 text-center space-y-3 animate-fadeInUp">
        <div className="text-5xl">{btn?.emoji ?? '🎉'}</div>
        <p className="text-white font-bold text-lg">
          {selected === 'yes' && 'Perfetto, ci sei!'}
          {selected === 'maybe' && 'Ok, ci proviamo!'}
          {selected === 'no' && 'Peccato, forse la prossima!'}
        </p>
        <p className="text-white/50 text-sm">
          La tua disponibilità è stata registrata, {name}.
        </p>
        <button
          onClick={() => { setSuccess(false); setSelected(null); }}
          className="text-white/40 text-xs hover:text-white/70 transition-colors underline"
        >
          Modifica risposta
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h3 className="text-white font-semibold flex items-center gap-2">
        <span>🙋</span> La tua disponibilità
      </h3>

      <div className="space-y-3">
        <div>
          <label className="text-white/60 text-xs font-medium uppercase tracking-wide mb-1 block">
            Il tuo nome *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Marco Rossi"
            maxLength={60}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wide mb-1 block">
              Email (opzionale)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.it"
            />
          </div>
          <div>
            <label className="text-white/60 text-xs font-medium uppercase tracking-wide mb-1 block">
              Nota (opzionale)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Es. arrivo tardi..."
              maxLength={120}
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-rose-400 text-sm bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        {BUTTONS.map((btn) => (
          <button
            key={btn.status}
            onClick={() => handleSubmit(btn.status)}
            disabled={loading}
            className={`${btn.cls} flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading && selected === btn.status ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <span>{btn.emoji}</span>
            )}
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
