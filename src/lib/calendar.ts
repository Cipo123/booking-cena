import { createEvent } from 'ics';
import type { Event } from './db';

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
