'use client';

import Link from 'next/link';
import type { Event } from '@/lib/db';

const EVENT_EMOJI: Record<string, string> = {
  cena: '🍽️',
  aperitivo: '🥂',
  colazione: '☕',
  pizza: '🍕',
  festa: '🎉',
  altro: '🎈',
};

const EVENT_LABEL: Record<string, string> = {
  cena: 'Cena',
  aperitivo: 'Aperitivo',
  colazione: 'Colazione',
  pizza: 'Pizza',
  festa: 'Festa',
  altro: 'Evento',
};

const TYPE_COLOR: Record<string, string> = {
  cena: 'from-violet-600 to-purple-700',
  aperitivo: 'from-amber-500 to-orange-600',
  colazione: 'from-sky-500 to-blue-600',
  pizza: 'from-red-500 to-rose-600',
  festa: 'from-pink-500 to-fuchsia-600',
  altro: 'from-teal-500 to-emerald-600',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function EventCard({ event, index }: { event: Event; index: number }) {
  const emoji = EVENT_EMOJI[event.type] ?? '🎈';
  const label = EVENT_LABEL[event.type] ?? 'Evento';
  const gradient = TYPE_COLOR[event.type] ?? 'from-violet-600 to-purple-700';

  return (
    <Link href={`/event/${event.id}`}>
      <div
        className="glass rounded-2xl overflow-hidden card-hover cursor-pointer animate-fadeInUp"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        {/* Color bar top */}
        <div className={`bg-gradient-to-r ${gradient} h-1.5`} />

        <div className="p-5 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r ${gradient} text-white`}
                >
                  {emoji} {label}
                </span>
              </div>
              <h3 className="text-white font-bold text-lg leading-snug truncate">{event.title}</h3>
            </div>
            <div className="text-3xl shrink-0">{emoji}</div>
          </div>

          {/* Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <span>📅</span>
              <span className="capitalize">{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <span>🕗</span>
              <span>{event.time}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <span>📍</span>
                <span className="truncate">{event.location}</span>
              </div>
            )}
            {event.max_participants && (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <span>👥</span>
                <span>Max {event.max_participants} partecipanti</span>
              </div>
            )}
          </div>

          {/* Description preview */}
          {event.description && (
            <p className="text-white/50 text-sm line-clamp-2">{event.description}</p>
          )}

          {/* CTA */}
          <div
            className={`flex items-center justify-between rounded-xl bg-gradient-to-r ${gradient} bg-opacity-20 px-4 py-2.5`}
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <span className="text-white/80 text-sm font-medium">Vedi dettagli e partecipa</span>
            <span className="text-white/60">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
