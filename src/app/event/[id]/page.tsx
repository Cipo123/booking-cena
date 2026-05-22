'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLang } from '@/context/providers';
import { googleCalendarUrl, outlookCalendarUrl } from '@/lib/calendar';
import AvailabilityForm from '@/components/AvailabilityForm';
import MapWidget from '@/components/MapWidget';
import MultiEventMap from '@/components/MultiEventMap';
import CountdownTimer from '@/components/CountdownTimer';
import QRCode from 'react-qr-code';
import CommentsFeed from '@/components/CommentsFeed';
import PhotoWall from '@/components/PhotoWall';
import PushSubscribeBtn from '@/components/PushSubscribeBtn';
import type { EventWithAvailabilities, Availability, EventPart } from '@/lib/db';

const EVENT_EMOJI: Record<string, string> = {
  cena: '🍽️', aperitivo: '🥂', colazione: '☕', pizza: '🍕', festa: '🎉', altro: '🎈',
};
const TYPE_COLOR: Record<string, string> = {
  cena: 'from-blue-600 to-indigo-700',
  aperitivo: 'from-amber-500 to-orange-600',
  colazione: 'from-sky-500 to-blue-600',
  pizza: 'from-red-500 to-rose-600',
  festa: 'from-sky-400 to-cyan-500',
  altro: 'from-teal-500 to-emerald-600',
};
const MULTI_GRADIENT = 'from-cyan-500 via-blue-500 to-indigo-600';

function formatDate(dateStr: string, lang: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(
    lang === 'it' ? 'it-IT' : 'en-GB',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
  );
}

function AttendeeGroup({ title, emoji, color, attendees }: {
  title: string; emoji: string; color: string; attendees: Availability[];
}) {
  if (!attendees.length) return null;
  return (
    <div className="space-y-2">
      <h4 className={`text-sm font-semibold flex items-center gap-1.5 ${color}`}>
        {emoji} {title} ({attendees.length})
      </h4>
      <div className="space-y-1.5">
        {attendees.map(a => (
          <div key={a.id} className="glass rounded-xl px-4 py-2.5 flex items-start justify-between gap-3">
            <div>
              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{a.user_name}</span>
              {a.note && <p className="text-xs mt-0.5 italic" style={{ color: 'var(--text-muted)' }}>&ldquo;{a.note}&rdquo;</p>}
            </div>
            {a.user_email && (
              <span className="text-xs truncate max-w-[140px]" style={{ color: 'var(--text-muted)' }}>{a.user_email}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PartCard({ part, availabilities }: { part: EventPart; availabilities: Availability[] }) {
  const { tr } = useLang();
  const partAvail = availabilities.filter(a => a.part_id === part.id);
  const yes    = partAvail.filter(a => a.status === 'yes');
  const maybe  = partAvail.filter(a => a.status === 'maybe');
  const no     = partAvail.filter(a => a.status === 'no');
  const gradient = TYPE_COLOR[part.type] ?? 'from-blue-600 to-indigo-700';
  const emoji    = EVENT_EMOJI[part.type] ?? '🎈';

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className={`bg-gradient-to-r ${gradient} px-4 py-3 flex items-center gap-3`}>
        <span className="text-2xl">{emoji}</span>
        <div className="flex-1">
          <p className="text-white font-bold">{part.title}</p>
          <p className="text-white/70 text-xs truncate">
            {part.time}{part.end_time ? ` → ${part.end_time}` : ''}{part.location ? ` · ${part.location}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 text-white">✅ {yes.length}</span>
          <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 text-white">🤔 {maybe.length}</span>
        </div>
      </div>
      {part.description && (
        <p className="px-4 py-2 text-sm" style={{ color: 'var(--text-muted)' }}>{part.description}</p>
      )}
      {partAvail.length > 0 && (
        <div className="px-4 py-3 space-y-3 border-t" style={{ borderColor: 'var(--card-border)' }}>
          <AttendeeGroup title={tr.event.yesGroup} emoji="✅" color="text-emerald-400" attendees={yes} />
          <AttendeeGroup title={tr.event.maybeGroup} emoji="🤔" color="text-amber-400" attendees={maybe} />
          <AttendeeGroup title={tr.event.noGroup} emoji="❌" color="text-rose-400" attendees={no} />
        </div>
      )}
    </div>
  );
}

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const { tr, lang } = useLang();
  const [event, setEvent] = useState<EventWithAvailabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [calOpen, setCalOpen]     = useState(false);
  const [copied, setCopied]       = useState(false);
  const [showQr, setShowQr]       = useState(false);

  async function handleShare(title: string, url: string) {
    if (navigator.share) { await navigator.share({ title, url }).catch(() => {}); }
    else { await navigator.clipboard.writeText(url).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2500); }
  }
  async function handleCopy(url: string) {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true); setTimeout(() => setCopied(false), 2500);
  }

  const reload = () => {
    fetch(`/api/events/${id}`)
      .then(r => r.json())
      .then(data => { setEvent(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { reload(); }, [id]);

  if (loading) return (
    <div className="max-w-2xl mx-auto space-y-4">
      {[1,2,3].map(i => <div key={i} className="glass rounded-2xl h-32 animate-pulse" />)}
    </div>
  );
  if (!event) return (
    <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>{tr.event.notFound}</div>
  );

  const isMulti  = event.parts.length > 0;
  const gradient = isMulti ? MULTI_GRADIENT : (TYPE_COLOR[event.type] ?? 'from-blue-600 to-indigo-700');
  const emoji    = isMulti ? '🎭' : (EVENT_EMOJI[event.type] ?? '🎈');
  const eventLevel = event.availabilities.filter(a => !a.part_id);
  const yes    = eventLevel.filter(a => a.status === 'yes');
  const maybe  = eventLevel.filter(a => a.status === 'maybe');
  const no     = eventLevel.filter(a => a.status === 'no');

  const shareBase = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl  = event.slug ? `${shareBase}/e/${event.slug}` : undefined;

  return (
    <div className="space-y-5 max-w-2xl mx-auto animate-fadeInUp">
      <a href="/" className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
        {tr.event.back}
      </a>

      {/* Header */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className={`bg-gradient-to-r ${gradient} p-6`}>
          <div className="text-5xl mb-2">{emoji}</div>
          <h1 className="text-2xl md:text-3xl font-black text-white leading-tight">{event.title}</h1>
          {event.slug && (
            <p className="text-white/50 text-xs mt-1 font-mono">/e/{event.slug}</p>
          )}
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <span>📅</span><span className="capitalize">{formatDate(event.date, lang)}</span>
            </div>
            {!isMulti && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>🕗</span><span>{event.time}</span>
              </div>
            )}
            {!isMulti && event.location && (
              <div className="flex items-center gap-2 text-sm sm:col-span-2" style={{ color: 'var(--text-secondary)' }}>
                <span>📍</span><span>{event.location}</span>
              </div>
            )}
            {event.max_participants && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>👥</span><span>{tr.event.maxSpots} {event.max_participants} {tr.event.spots}</span>
              </div>
            )}
            {event.rsvp_deadline && (
              <div className="flex items-center gap-2 text-sm sm:col-span-2" style={{
                color: new Date(event.rsvp_deadline) < new Date() ? '#f87171' : 'var(--text-secondary)'
              }}>
                <span>⏰</span>
                <span>
                  {tr.event.rsvpDeadline}: {new Date(event.rsvp_deadline).toLocaleString(
                    lang === 'it' ? 'it-IT' : 'en-GB',
                    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
                  )}
                  {new Date(event.rsvp_deadline) < new Date() && ' 🔒'}
                </span>
              </div>
            )}
          </div>
          {event.description && (
            <p className="text-sm leading-relaxed pt-2 border-t" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
              {event.description}
            </p>
          )}
          {/* Quick stats + push button (event-level only) */}
          {event.parts.length === 0 && (
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: 'rgba(16,185,129,0.15)' }}>
                <span>✅</span><span className="text-emerald-400 font-bold text-sm">{yes.length}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: 'rgba(245,158,11,0.15)' }}>
                <span>🤔</span><span className="text-amber-400 font-bold text-sm">{maybe.length}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: 'rgba(244,63,94,0.15)' }}>
                <span>❌</span><span className="text-rose-400 font-bold text-sm">{no.length}</span>
              </div>
              <PushSubscribeBtn eventId={event.id} lang={lang} />
            </div>
          )}

          {/* Share + Calendar inline dropdowns */}
          <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--card-border)' }}>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setShareOpen(o => !o); setCalOpen(false); setShowQr(false); }}
                className="flex items-center gap-2 glass-strong rounded-xl px-4 py-2 text-sm transition-all hover:scale-105"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>📤</span> {tr.event.shareBtn}
              </button>
              <button
                onClick={() => { setCalOpen(o => !o); setShareOpen(false); }}
                className="flex items-center gap-2 glass-strong rounded-xl px-4 py-2 text-sm transition-all hover:scale-105"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span>📆</span> {tr.event.calendar}
              </button>
            </div>

            {shareOpen && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleShare(event.title, shareUrl ?? window.location.href)}
                  className="flex items-center gap-2 glass-strong rounded-xl px-4 py-2 text-sm transition-all hover:scale-105 active:scale-95"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>📤</span> {tr.event.share}
                </button>
                <button
                  onClick={() => handleCopy(shareUrl ?? window.location.href)}
                  className="flex items-center gap-2 glass-strong rounded-xl px-4 py-2 text-sm transition-all hover:scale-105 active:scale-95"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>{copied ? '✅' : '📋'}</span> {copied ? tr.event.copied : tr.event.copyLink}
                </button>
                <button
                  onClick={() => setShowQr(q => !q)}
                  className="flex items-center gap-2 glass-strong rounded-xl px-4 py-2 text-sm transition-all hover:scale-105 active:scale-95"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>📱</span> {showQr ? tr.event.hideQr : tr.event.showQr}
                </button>
                {showQr && shareUrl && (
                  <div className="w-full flex justify-center pt-1">
                    <QRCode value={shareUrl} size={140} />
                  </div>
                )}
              </div>
            )}

            {calOpen && (
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/events/${event.id}/ics`}
                  className="flex items-center gap-2 glass-strong rounded-xl px-4 py-2 text-sm transition-all hover:scale-105 active:scale-95"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>📥</span> {tr.event.downloadIcs}
                </a>
                <a
                  href={googleCalendarUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 glass-strong rounded-xl px-4 py-2 text-sm transition-all hover:scale-105 active:scale-95"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>📅</span> {tr.event.googleCal}
                </a>
                <a
                  href={outlookCalendarUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 glass-strong rounded-xl px-4 py-2 text-sm transition-all hover:scale-105 active:scale-95"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <span>📧</span> {tr.event.outlookCal}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Countdown */}
      <CountdownTimer date={event.date} time={event.time} />

      {/* Meeting point */}
      {event.meeting_point && (
        <div className="glass rounded-2xl px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">🚩</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {tr.event.meetingPoint}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{event.meeting_point}</p>
          </div>
        </div>
      )}

      {/* Map (single event location) */}
      {!isMulti && event.location && <MapWidget location={event.location} />}

      {/* Global route map (multi-part only) */}
      {isMulti && (
        <MultiEventMap
          meetingPoint={event.meeting_point || undefined}
          parts={event.parts}
        />
      )}

      {/* Multi-part schedule */}
      {event.parts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{tr.event.parts}</h3>
          {event.parts.map(part => (
            <PartCard key={part.id} part={part} availabilities={event.availabilities} />
          ))}
        </div>
      )}

      {/* Availability form */}
      <AvailabilityForm eventId={event.id} parts={event.parts} rsvpDeadline={event.rsvp_deadline} onSuccess={reload} />

      {/* Event-level attendees (only if no parts) */}
      {event.parts.length === 0 && eventLevel.length > 0 && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            <span>👥</span> {tr.event.attendees} ({eventLevel.length})
          </h3>
          <AttendeeGroup title={tr.event.yesGroup} emoji="✅" color="text-emerald-400" attendees={yes} />
          <AttendeeGroup title={tr.event.maybeGroup} emoji="🤔" color="text-amber-400" attendees={maybe} />
          <AttendeeGroup title={tr.event.noGroup} emoji="❌" color="text-rose-400" attendees={no} />
        </div>
      )}

      {event.parts.length === 0 && eventLevel.length === 0 && (
        <p className="text-center text-sm py-4" style={{ color: 'var(--text-muted)' }}>{tr.event.noAttendees}</p>
      )}

      {/* Photo wall */}
      <PhotoWall eventId={event.id} lang={lang} />

      {/* Comments feed */}
      <CommentsFeed eventId={event.id} />
    </div>
  );
}
