'use client';

import Link from 'next/link';
import { useLang } from '@/context/providers';
import type { Event } from '@/lib/db';

const EVENT_EMOJI: Record<string, string> = {
  cena: '🍽️', aperitivo: '🥂', colazione: '☕', pizza: '🍕', festa: '🎉', altro: '🎈',
};
const EVENT_LABEL_IT: Record<string, string> = {
  cena: 'Cena', aperitivo: 'Aperitivo', colazione: 'Colazione', pizza: 'Pizza', festa: 'Festa', altro: 'Evento',
};
const EVENT_LABEL_EN: Record<string, string> = {
  cena: 'Dinner', aperitivo: 'Aperitif', colazione: 'Breakfast', pizza: 'Pizza', festa: 'Party', altro: 'Event',
};
const TYPE_COLOR: Record<string, string> = {
  cena: 'from-violet-600 to-purple-700',
  aperitivo: 'from-amber-500 to-orange-600',
  colazione: 'from-sky-500 to-blue-600',
  pizza: 'from-red-500 to-rose-600',
  festa: 'from-pink-500 to-fuchsia-600',
  altro: 'from-teal-500 to-emerald-600',
};

export default function EventCard({ event, index }: { event: Event; index: number }) {
  const { tr, lang } = useLang();

  const emoji     = EVENT_EMOJI[event.type] ?? '🎈';
  const label     = (lang === 'it' ? EVENT_LABEL_IT : EVENT_LABEL_EN)[event.type] ?? 'Evento';
  const gradient  = TYPE_COLOR[event.type] ?? 'from-violet-600 to-purple-700';
  const hasPartsCount = (event as Event & { parts_count?: number }).parts_count ?? 0;

  const formattedDate = new Date(event.date + 'T00:00:00').toLocaleDateString(
    lang === 'it' ? 'it-IT' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );

  return (
    <Link href={`/event/${event.id}`}>
      <div
        className="glass rounded-2xl overflow-hidden card-hover cursor-pointer animate-fadeInUp"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className={`bg-gradient-to-r ${gradient} h-1.5`} />
        <div className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r ${gradient} text-white`}>
                  {emoji} {label}
                </span>
                {hasPartsCount > 0 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                    🎭 multi-tappa
                  </span>
                )}
              </div>
              <h3 className="font-bold text-lg leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
                {event.title}
              </h3>
            </div>
            <div className="text-3xl shrink-0">{emoji}</div>
          </div>

          <div className="space-y-1.5">
            {[
              { icon: '📅', text: formattedDate },
              { icon: '🕗', text: event.time },
              event.location ? { icon: '📍', text: event.location } : null,
              event.max_participants ? { icon: '👥', text: `${tr.home.maxPart} ${event.max_participants} ${tr.home.partecipanti}` } : null,
            ].filter(Boolean).map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>{item!.icon}</span>
                <span className="truncate capitalize">{item!.text}</span>
              </div>
            ))}
          </div>

          {event.description && (
            <p className="text-sm line-clamp-2" style={{ color: 'var(--text-muted)' }}>{event.description}</p>
          )}

          <div className="flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: 'var(--card-bg)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{tr.home.seeDetails}</span>
            <span style={{ color: 'var(--text-muted)' }}>→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
