import { createEvent } from 'ics';
import type { Event, EventPart } from './db';

function parseDateTime(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return { year, month, day, hour, minute };
}

export function generateICS(event: Event): string {
  const start = parseDateTime(event.date, event.time);
  const startDate = new Date(start.year, start.month - 1, start.day, start.hour, start.minute);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const { error, value } = createEvent({
    start: [start.year, start.month, start.day, start.hour, start.minute],
    end: [
      endDate.getFullYear(),
      endDate.getMonth() + 1,
      endDate.getDate(),
      endDate.getHours(),
      endDate.getMinutes(),
    ],
    title: event.title,
    description: event.description || '',
    location: event.location || '',
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
  });

  if (error) throw new Error(`ICS generation failed: ${error}`);
  return value!;
}

export function googleCalendarUrl(event: Event): string {
  const start = parseDateTime(event.date, event.time);
  const startDate = new Date(start.year, start.month - 1, start.day, start.hour, start.minute);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(startDate)}/${fmt(endDate)}`,
    details: event.description || '',
    location: event.location || '',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(event: Event): string {
  const start = parseDateTime(event.date, event.time);
  const startDate = new Date(start.year, start.month - 1, start.day, start.hour, start.minute);
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    body: event.description || '',
    location: event.location || '',
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/* ── Per-tappa helpers (multi-event) ── */

function partTimes(part: EventPart, eventDate: string) {
  const start = parseDateTime(eventDate, part.time || '00:00');
  const startDate = new Date(start.year, start.month - 1, start.day, start.hour, start.minute);
  let endDate: Date;
  if (part.end_time) {
    const end = parseDateTime(eventDate, part.end_time);
    endDate = new Date(end.year, end.month - 1, end.day, end.hour, end.minute);
  } else {
    endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  }
  return { start, startDate, endDate };
}

export function generateICSForPart(part: EventPart, eventDate: string): string {
  const { start, startDate, endDate } = partTimes(part, eventDate);
  const { error, value } = createEvent({
    start: [start.year, start.month, start.day, start.hour, start.minute],
    end: [endDate.getFullYear(), endDate.getMonth() + 1, endDate.getDate(), endDate.getHours(), endDate.getMinutes()],
    title: part.title,
    description: part.description || '',
    location: part.location || '',
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
  });
  if (error) throw new Error(`ICS generation failed: ${error}`);
  return value!;
}

export function googleCalendarUrlForPart(part: EventPart, eventDate: string): string {
  const { startDate, endDate } = partTimes(part, eventDate);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: part.title,
    dates: `${fmt(startDate)}/${fmt(endDate)}`,
    details: part.description || '',
    location: part.location || '',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrlForPart(part: EventPart, eventDate: string): string {
  const { startDate, endDate } = partTimes(part, eventDate);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: part.title,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    body: part.description || '',
    location: part.location || '',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
