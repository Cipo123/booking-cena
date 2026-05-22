'use client';

import { useEffect, useState, useRef } from 'react';
import { useLang } from '@/context/providers';
import type { EventComment } from '@/lib/db';

function timeAgo(dateStr: string, lang: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (lang === 'it') {
    if (mins < 1) return 'adesso';
    if (mins < 60) return `${mins} min fa`;
    if (hours < 24) return `${hours}h fa`;
    return `${days}g fa`;
  } else {
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
}

export default function CommentsFeed({ eventId }: { eventId: string }) {
  const { tr, lang } = useLang();
  const [comments, setComments] = useState<EventComment[]>([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchComments = () =>
    fetch(`/api/events/${eventId}/comments`)
      .then(r => r.json())
      .then(data => Array.isArray(data) && setComments(data));

  useEffect(() => {
    fetchComments();
    const interval = setInterval(fetchComments, 15000);
    return () => clearInterval(interval);
  }, [eventId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      setError(lang === 'it' ? 'Nome e messaggio obbligatori' : 'Name and message required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: name.trim(), message: message.trim() }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Errore');
        return;
      }
      setMessage('');
      await fetchComments();
    } catch {
      setError(lang === 'it' ? 'Errore, riprova.' : 'Error, retry.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
        <span>💬</span>
        {lang === 'it' ? `Bacheca (${comments.length})` : `Board (${comments.length})`}
      </h3>

      {/* Comments list */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {comments.length === 0 ? (
          <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>
            {lang === 'it' ? 'Nessun messaggio ancora — sii il primo! 👋' : 'No messages yet — be the first! 👋'}
          </p>
        ) : (
          comments.map(c => (
            <div
              key={c.id}
              className="glass-strong rounded-xl px-4 py-3 animate-fadeInUp"
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {c.user_name}
                </span>
                <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                  {timeAgo(c.created_at, lang)}
                </span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {c.message}
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input form */}
      <form onSubmit={submit} className="space-y-2 border-t pt-3" style={{ borderColor: 'var(--card-border)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={lang === 'it' ? 'Il tuo nome' : 'Your name'}
            maxLength={60}
            className="sm:col-span-1"
          />
          <div className="sm:col-span-2 flex gap-2">
            <input
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={lang === 'it' ? 'Scrivi un messaggio...' : 'Write a message...'}
              maxLength={500}
              className="flex-1"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary rounded-xl px-4 py-2 text-white font-semibold text-sm disabled:opacity-50 shrink-0"
            >
              {loading ? '⏳' : '→'}
            </button>
          </div>
        </div>
        {error && (
          <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
        )}
      </form>
    </div>
  );
}
