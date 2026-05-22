'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/context/providers';

function getTimeLeft(date: string, time: string) {
  const target = new Date(`${date}T${time}`).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return null;
  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds };
}

export default function CountdownTimer({ date, time }: { date: string; time: string }) {
  const { tr } = useLang();
  const [left, setLeft] = useState(() => getTimeLeft(date, time));
  const eventDate = new Date(`${date}T${time}`);
  const isPast = eventDate.getTime() < Date.now() - 2 * 60 * 60 * 1000;
  const isNow  = !isPast && eventDate.getTime() < Date.now() + 2 * 60 * 60 * 1000 && eventDate.getTime() > Date.now() - 2 * 60 * 60 * 1000;

  useEffect(() => {
    if (isPast || isNow) return;
    const t = setInterval(() => setLeft(getTimeLeft(date, time)), 1000);
    return () => clearInterval(t);
  }, [date, time, isPast, isNow]);

  if (isPast) {
    return (
      <div className="glass rounded-2xl px-5 py-3 flex items-center justify-center gap-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
          {tr.event.past}
        </span>
      </div>
    );
  }

  if (isNow) {
    return (
      <div className="glass rounded-2xl px-5 py-3 flex items-center justify-center gap-2 countdown-pulse">
        <span className="text-sm font-bold" style={{ color: '#f59e0b' }}>
          {tr.event.happeningNow}
        </span>
      </div>
    );
  }

  if (!left) return null;

  const units = [
    { value: left.days,    label: tr.event.days },
    { value: left.hours,   label: tr.event.hours },
    { value: left.minutes, label: tr.event.minutes },
    { value: left.seconds, label: tr.event.seconds },
  ];

  return (
    <div className="glass rounded-2xl px-5 py-4 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
        {tr.event.countdown}
      </p>
      <div className="flex items-end gap-3">
        {units.map(({ value, label }) => (
          <div key={label} className="flex flex-col items-center">
            <span
              className="text-2xl font-black tabular-nums"
              style={{
                background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {String(value).padStart(2, '0')}
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
