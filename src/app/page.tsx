import { eventsDb } from '@/lib/db';
import EventCard from '@/components/EventCard';

export const dynamic = 'force-dynamic';

export default function HomePage() {
  const events = eventsDb.getAll();

  const now = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const upcoming = events.filter((e) => new Date(`${e.date}T${e.time}`) >= now);
  const past = events.filter((e) => new Date(`${e.date}T${e.time}`) < now);

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3 py-6 animate-fadeInUp">
        <h1
          className="text-4xl md:text-5xl font-black tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #a78bfa 0%, #f472b6 50%, #fb923c 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Prossime Uscite 🎊
        </h1>
        <p className="text-white/60 text-lg max-w-xl mx-auto">
          Dichiara la tua disponibilità, salva l&apos;evento in calendario e non perdere nemmeno
          un&apos;uscita!
        </p>
      </div>

      {/* Upcoming */}
      {upcoming.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center space-y-3 animate-fadeInUp">
          <p className="text-5xl">🗓️</p>
          <p className="text-white/70 text-lg">Nessun evento in programma.</p>
          <p className="text-white/40 text-sm">L&apos;admin aggiungerà presto nuove uscite!</p>
        </div>
      ) : (
        <section className="space-y-4">
          <h2 className="text-white/80 font-semibold text-sm uppercase tracking-widest px-1">
            Prossimi eventi ({upcoming.length})
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {upcoming.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
        </section>
      )}

      {/* Past */}
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-white/40 font-semibold text-sm uppercase tracking-widest px-1">
            eventi passati ({past.length})
          </h2>
          <div className="grid gap-5 md:grid-cols-2 opacity-50">
            {past.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
