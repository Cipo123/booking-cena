'use client';

interface Props {
  yes: number;
  maybe: number;
  no: number;
  size?: number;
}

export default function AttendanceDonut({ yes, maybe, no, size = 64 }: Props) {
  const total = yes + maybe + no;
  if (total === 0) {
    return (
      <div
        className="rounded-full border-2 flex items-center justify-center text-xs font-bold"
        style={{
          width: size,
          height: size,
          borderColor: 'var(--card-border)',
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}
      >
        —
      </div>
    );
  }

  const r = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const segments = [
    { count: yes,   color: '#10b981', label: 'yes' },
    { count: maybe, color: '#f59e0b', label: 'maybe' },
    { count: no,    color: '#f43f5e', label: 'no' },
  ];

  let offset = 0;
  const arcs = segments
    .filter(s => s.count > 0)
    .map(s => {
      const pct = s.count / total;
      const len = pct * circumference;
      const gap = 0;
      const arc = { ...s, dashArray: `${len - gap} ${circumference - len + gap}`, dashOffset: -offset };
      offset += len;
      return arc;
    });

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background ring */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="var(--card-border)"
          strokeWidth={6}
        />
        {/* Colored arcs */}
        {arcs.map(arc => (
          <circle
            key={arc.label}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={arc.color}
            strokeWidth={6}
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      {/* Center label */}
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{ lineHeight: 1.1 }}
      >
        <span className="text-sm font-black" style={{ color: '#10b981' }}>{yes}</span>
      </div>
    </div>
  );
}
