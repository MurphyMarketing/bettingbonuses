/**
 * Money is stored as integer USD cents (never floats). These helpers convert
 * at the edges: dollars-string <-> cents for forms, cents -> display string.
 */

/** Format integer cents as a USD string for display, e.g. 20000 -> "$200.00". */
export function formatUsdCents(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

/** Display a bonus amount the way a bettor reads it: drop the trailing `.00`
 *  on whole-dollar amounts ($1,000 not $1,000.00), but keep cents when the
 *  amount actually has them ($12.50). Used by the offer cards. */
export function formatBonusAmount(cents: number | null | undefined): string {
  if (cents == null) return '—';
  const hasCents = cents % 100 !== 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Cents -> plain dollar string for a form input value, e.g. 20000 -> "200.00".
 *  Empty string for null/undefined. */
export function centsToDollarInput(cents: number | null | undefined): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2);
}

/** Parse a user-entered dollar string into integer cents. Returns null for
 *  blank, or NaN for malformed input (callers/validators treat NaN as invalid).
 *  Integer math only — no float rounding surprises. */
export function dollarsToCents(input: string): number | null | typeof NaN {
  const cleaned = input.replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return NaN;
  const [whole, frac = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}
