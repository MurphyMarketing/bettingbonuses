/** Single source of truth for event time status. Server clock (UTC); fine on Vercel. */
export type EventTimeStatus = 'past' | 'current' | 'upcoming' | 'evergreen';

const DAY_MS = 24 * 60 * 60 * 1000;

export function eventTimeStatus(event: { startsAt: Date | null; endsAt: Date | null }, now: Date = new Date()): EventTimeStatus {
  if (!event.startsAt) return 'evergreen';
  const end = event.endsAt ?? new Date(event.startsAt.getTime() + DAY_MS);
  if (now > end) return 'past';
  if (now >= event.startsAt) return 'current';
  return 'upcoming';
}

/** Whole days from now until `date` (ceil). Negative if in the past. */
export function daysUntil(date: Date, now: Date = new Date()): number {
  return Math.ceil((date.getTime() - now.getTime()) / DAY_MS);
}

export const EVENT_STATUS_LABEL: Record<EventTimeStatus, string> = {
  past: 'Past',
  current: 'Live now',
  upcoming: 'Upcoming',
  evergreen: 'Evergreen',
};
