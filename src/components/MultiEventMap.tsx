'use client';

import { useState } from 'react';
import { useLang } from '@/context/providers';
import type { EventPart } from '@/lib/db';

const PART_EMOJI: Record<string, string> = {
  cena: '🍽️', aperitivo: '🥂', colazione: '☕', pizza: '🍕', festa: '🎉', altro: '🎈',
};

type TravelMode = 'd' | 'w';

interface Pin {
  id: string;
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

  // Costruisce tutti i pin disponibili
  const allPins: Pin[] = [];
  if (meetingPoint) {
    allPins.push({ id: '__meeting__', name: tr.event.meetingPoint, location: meetingPoint, emoji: '🚩' });
  }
  parts.forEach(part => {
    if (part.location) {
      allPins.push({ id: part.id, name: part.title, location: part.location, emoji: PART_EMOJI[part.type] ?? '📍', time: part.time });
    }
  });

  if (allPins.length === 0) return null;

  // Tutti i pin attivi per default
  const [checked, setChecked] = useState<Set<string>>(() => new Set(allPins.map(p => p.id)));
  const [mode, setMode] = useState<TravelMode>('d');

  function toggle(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      // Non permettere di deselezionare l'ultimo pin attivo
      if (next.has(id) && next.size === 1) return prev;
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // Pin attivi nell'ordine originale
  const activePins = allPins.filter(p => checked.has(p.id));
  const hasRoute = activePins.length > 1;

  // Costruisce URL embed
  let embedUrl: string;
  let mapsUrl: string;

  if (!hasRoute) {
    const enc = encodeURIComponent(activePins[0].location);
    embedUrl = `https://maps.google.com/maps?q=${enc}&output=embed&z=15`;
    mapsUrl  = `https://www.google.com/maps/search/?api=1&query=${enc}`;
  } else {
    const [first, ...rest] = activePins;
    const origin = encodeURIComponent(first.location);
    const daddr  = rest
      .map((p, i) => (i === 0 ? encodeURIComponent(p.location) : `to:${encodeURIComponent(p.location)}`))
      .join('+');
    embedUrl = `https://maps.google.com/maps?saddr=${origin}&daddr=${daddr}&output=embed&dirflg=${mode}`;
    mapsUrl  = `https://www.google.com/maps/dir/${activePins.map(p => encodeURIComponent(p.location)).join('/')}`;
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between gap-3 border-b" style={{ borderColor: 'var(--card-border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{tr.event.mapRouteTitle}</p>
        </div>
        {/* Toggle auto/piedi — solo con percorso */}
        {hasRoute && (
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

      {/* Pin checkabili */}
      <div className="px-5 py-3 flex flex-wrap gap-2 border-b" style={{ borderColor: 'var(--card-border)' }}>
        {allPins.map(pin => {
          const active = checked.has(pin.id);
          return (
            <button
              key={pin.id}
              onClick={() => toggle(pin.id)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all hover:scale-105 active:scale-95"
              style={{
                background: active ? 'rgba(96,165,250,0.18)' : 'rgba(255,255,255,0.05)',
                border: active ? '1px solid rgba(96,165,250,0.5)' : '1px solid rgba(255,255,255,0.1)',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                opacity: active ? 1 : 0.5,
              }}
            >
              <span>{pin.emoji}</span>
              <span>{pin.name}</span>
              {pin.time && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {pin.time}</span>}
              {active && <span style={{ color: '#60a5fa' }}>✓</span>}
            </button>
          );
        })}
      </div>

      {/* Mappa */}
      <div style={{ height: '320px' }}>
        <iframe
          key={`${mode}-${[...checked].sort().join(',')}`}
          src={embedUrl}
          width="100%"
          height="320"
          style={{ border: 0, display: 'block' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="route map"
        />
      </div>

      {/* Apri in Maps */}
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
