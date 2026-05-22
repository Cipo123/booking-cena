'use client';

import { useState } from 'react';
import { useLang } from '@/context/providers';
import type { EventPart } from '@/lib/db';

const PART_EMOJI: Record<string, string> = {
  cena: '🍽️', aperitivo: '🥂', colazione: '☕', pizza: '🍕', festa: '🎉', altro: '🎈',
};

type TravelMode = 'd' | 'w'; // d = driving, w = walking

interface Pin {
  name: string;
  location: string;
  emoji: string;
  time?: string;
}

export default function MultiEventMap({
  meetingPoint,
  parts,
}: {
  meetingPoint?: string;
  parts: EventPart[];
}) {
  const { tr } = useLang();
  const [mode, setMode] = useState<TravelMode>('d');

  // Raccoglie tutti i pin validi
  const pins: Pin[] = [];

  if (meetingPoint) {
    pins.push({
      name: tr.event.meetingPoint,
      location: meetingPoint,
      emoji: '🚩',
    });
  }

  parts.forEach(part => {
    if (part.location) {
      pins.push({
        name: part.title,
        location: part.location,
        emoji: PART_EMOJI[part.type] ?? '📍',
        time: part.time,
      });
    }
  });

  if (pins.length === 0) return null;

  const hasMultiplePins = pins.length > 1;

  // Costruisce URL embed e link "apri in Maps"
  let embedUrl: string;
  let mapsUrl: string;

  if (!hasMultiplePins) {
    const enc = encodeURIComponent(pins[0].location);
    embedUrl = `https://maps.google.com/maps?q=${enc}&output=embed&z=15`;
    mapsUrl  = `https://www.google.com/maps/search/?api=1&query=${enc}`;
  } else {
    const [first, ...rest] = pins;
    const origin = encodeURIComponent(first.location);
    const daddr  = rest
      .map((p, i) => (i === 0 ? encodeURIComponent(p.location) : `to:${encodeURIComponent(p.location)}`))
      .join('+');
    embedUrl = `https://maps.google.com/maps?saddr=${origin}&daddr=${daddr}&output=embed&dirflg=${mode}`;
    mapsUrl  = `https://www.google.com/maps/dir/${pins.map(p => encodeURIComponent(p.location)).join('/')}`;
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header con titolo + toggle modalità */}
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{tr.event.mapRouteTitle}</p>
        </div>

        {/* Toggle auto / piedi — solo se ci sono più pin */}
        {hasMultiplePins && (
          <div className="flex rounded-xl overflow-hidden glass-strong">
            {([['d', tr.event.mapDriving], ['w', tr.event.mapWalking]] as [TravelMode, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setMode(val)}
                className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                  mode === val
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white'
                    : 'opacity-50 hover:opacity-80'
                }`}
                style={mode !== val ? { color: 'var(--text-secondary)' } : {}}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Leggenda tappe */}
      <div className="px-5 py-3 flex flex-wrap gap-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
        {pins.map((pin, i) => (
          <div
            key={i}
            className="flex items-center gap-1.5 glass-strong rounded-full px-3 py-1 text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>{pin.emoji}</span>
            <span className="font-semibold">{pin.name}</span>
            {pin.time && <span style={{ color: 'var(--text-muted)' }}>· {pin.time}</span>}
          </div>
        ))}
      </div>

      {/* Iframe mappa */}
      <div style={{ height: '320px' }}>
        <iframe
          key={`${mode}-${pins.length}`}
          src={embedUrl}
          width="100%"
          height="320"
          style={{ border: 0, display: 'block' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="multi-event route map"
        />
      </div>

      {/* Link apri in Maps */}
      <div className="px-5 py-3 flex justify-end border-t" style={{ borderColor: 'var(--card-border)' }}>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold flex items-center gap-1.5 glass-strong rounded-xl px-4 py-2 transition-all hover:scale-105"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span>↗️</span> {tr.event.mapOpenRoute}
        </a>
      </div>
    </div>
  );
}
