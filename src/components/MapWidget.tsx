'use client';

import { useState } from 'react';
import { useLang } from '@/context/providers';

export default function MapWidget({ location }: { location: string }) {
  const { tr } = useLang();
  const [open, setOpen] = useState(false);
  if (!location) return null;

  const encoded = encodeURIComponent(location);
  const embedUrl = `https://maps.google.com/maps?q=${encoded}&output=embed&z=15`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}`;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/5"
      >
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
          {tr.event.mapLabel}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="animate-fadeIn">
          <div className="relative w-full" style={{ height: '220px' }}>
            <iframe
              src={embedUrl}
              width="100%"
              height="220"
              style={{ border: 0, display: 'block' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="map"
            />
          </div>
          <div className="px-5 py-3 flex justify-end">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold flex items-center gap-1.5 glass-strong rounded-xl px-4 py-2 transition-all hover:scale-105"
              style={{ color: 'var(--text-secondary)' }}
            >
              <span>🗺️</span> {tr.event.viewMap}
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
