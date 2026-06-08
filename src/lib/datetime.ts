/**
 * Date helpers for the admin UI. Rendered in server components, so "now" is
 * server time and there's no client/server hydration mismatch.
 */
const MS_PER_DAY = 86_400_000;

/** An offer is stale if it has never been verified, or was verified more than
 *  `days` ago (default 14). The list page surfaces this as a "Stale" badge. */
export function isStale(verifiedAt: Date | null | undefined, days = 14): boolean {
  if (!verifiedAt) return true;
  return Date.now() - verifiedAt.getTime() > days * MS_PER_DAY;
}

/** Human relative time, e.g. "3 days ago", "in 2 hours", "just now". */
export function formatRelativeTime(d: Date): string {
  const diffMs = d.getTime() - Date.now(); // negative = past
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', MS_PER_DAY],
    ['hour', 3_600_000],
    ['minute', 60_000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) return rtf.format(Math.round(diffMs / ms), unit);
  }
  return 'just now';
}

/** Date -> value for an <input type="datetime-local">, in local time. */
export function toDatetimeLocalInput(d: Date | null | undefined): string {
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
