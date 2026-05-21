import { notFound } from 'next/navigation';
import { eventsDb } from '@/lib/db';
import { googleCalendarUrl, outlookCalendarUrl } from '@/lib/calendar';
import AvailabilityForm from '@/components/AvailabilityForm';
import type { Availability } from '@/lib/db';

export const dynamic = 'force-dynamic';

const EVENT_EMOJI: Record<string, string> = {
  cena: '🍽️', aperitivo: '🥂', colazione: '☕', pizza: '🍕', festa: '🎉', altro: '🎈',
};
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
  return d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function AttendeeGroup({
  title, emoji, color, attendees,
}: { title: string; emoji: string; color: string; attendees: Availability[] }) {
  if (attendees.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className={`text-sm font-semibold flex items-center gap-1.5 ${color}`}>
        <span>{emoji}</span> {title} ({attendees.length})
      </h4>
      <div className="space-y-1.5">
        {attendees.map((a) => (
          <div key={a.id} className="glass rounded-xl px-4 py-2.5 flex items-start justify-between gap-3">
            <div>
              <span className="text-white font-medium text-sm">{a.user_name}</span>
              {a.note && <p className="text-white/50 text-xs mt-0.5 italic">&ldquo;{a.note}&rdquo;</p>}
            </div>
            {a.user_email && (
              <span className="text-white/40 text-xs truncate max-w-[140px]">{a.user_email}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await eventsDb.getWithAvailabilities(id);
  if (!event) notFound();

  const yes = event.availabilities.filter((a) => a.status === 'yes');
  const maybe = event.availabilities.filter((a) => a.status === 'maybe');
  const no = event.availabilities.filter((a) => a.status === 'no');

  const gradient = TYPE_COLOR[event.type] ?? 'from-violet-600 to-purple-700';
  const emoji = EVENT_EMOJI[event.type] ?? '🎈';
  const googleUrl = googleCalendarUrl(event);
  const outlookUrl = outlookCalendarUrl(event);

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fadeInUp">
      {/* Back */}
      <a href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm">
        ← Torna agli eventi
      </a>

      {/* Event header */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className={`bg-gradient-to-r ${gradient} p-6 space-y-1`}>
          <div className="text-5xl mb-2">{emoji}</div>
          <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">{event.title}</h1>
        </div>

        <div className="p-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-white/80">
              <span className="text-lg">📅</span>
              <span className="capitalize text-sm">{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <span className="text-lg">🕗</span>
              <span className="text-sm">{event.time}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-white/80 sm:col-span-2">
                <span className="text-lg">📍</span>
                <span className="text-sm">{event.location}</span>
              </div>
            )}
            {event.max_participants && (
              <div className="flex items-center gap-2 text-white/80">
                <span className="text-lg">👥</span>
                <span className="text-sm">Max {event.max_participants} posti</span>
              </div>
            )}
          </div>

          {event.description && (
            <p className="text-white/60 text-sm leading-relaxed pt-1 border-t border-white/10">
              {event.description}
            </p>
          )}

          {/* Quick stats */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-1.5 bg-emerald-500/20 rounded-full px-3 py-1">
              <span>✅</span>
              <span className="text-emerald-300 font-bold text-sm">{yes.length}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-amber-500/20 rounded-full px-3 py-1">
              <span>🤔</span>
              <span className="text-amber-300 font-bold text-sm">{maybe.length}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-rose-500/20 rounded-full px-3 py-1">
              <span>❌</span>
              <span className="text-rose-300 font-bold text-sm">{no.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar export */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <span>📆</span> Aggiungi al calendario
        </h3>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/events/${event.id}/ics`}
            className="flex items-center gap-2 glass-strong rounded-xl px-4 py-2 text-sm text-white/80 hover:text-white hover:border-violet-400/50 transition-all"
          >
            <span>📥</span> Scarica .ics
          </a>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 glass-strong rounded-xl px-4 py-2 text-sm text-white/80 hover:text-white hover:border-blue-400/50 transition-all"
          >
            <span>📅</span> Google Calendar
          </a>
          <a
            href={outlookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 glass-strong rounded-xl px-4 py-2 text-sm text-white/80 hover:text-white hover:border-sky-400/50 transition-all"
          >
            <span>📧</span> Outlook Calendar
          </a>
        </div>
      </div>

      {/* Availability form */}
      <AvailabilityForm eventId={event.id} />

      {/* Attendees */}
      {event.availabilities.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-5">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <span>👥</span> Partecipanti ({event.availabilities.length})
          </h3>
          <AttendeeGroup title="Ci sono!" emoji="✅" color="text-emerald-400" attendees={yes} />
          <AttendeeGroup title="Forse" emoji="🤔" color="text-amber-400" attendees={maybe} />
          <AttendeeGroup title="Non possono" emoji="❌" color="text-rose-400" attendees={no} />
        </div>
      )}
    </div>
  );
}
