'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';

export type PickerSport = { value: string; label: string };
// `series` rows are the recurring events (event_series). `endsAt` is the current
// occurrence's end, used to auto-fill a blank "Valid to".
export type PickerSeries = { value: string; label: string; group: string; endsAt: string | null };

type Target = 'brand' | 'sport' | 'series';

const SELECT_CLASS = 'h-9 w-full rounded-lg border bg-transparent px-2 text-sm';

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * "This offer applies to" picker. Post-Sprint L there are three targets:
 * Brand-wide / a League-sport (sports.id) / an Event (event_series.id). Mutual
 * exclusivity is enforced by the radio + two hidden inputs (only the active
 * target submits a non-empty id); the server action and the offers_single_target
 * CHECK (≤1 of sport_id, series_id) are the backstops.
 */
export function OfferTargetPicker({
  sports,
  series,
  defaultSportId,
  defaultSeriesId,
  errors,
}: {
  sports: PickerSport[];
  series: PickerSeries[];
  defaultSportId: string;
  defaultSeriesId: string;
  errors?: string[];
}) {
  const initial: Target = defaultSeriesId ? 'series' : defaultSportId ? 'sport' : 'brand';
  const [target, setTarget] = useState<Target>(initial);
  const [sportId, setSportId] = useState(defaultSportId);
  const [seriesId, setSeriesId] = useState(defaultSeriesId);

  const groups = new Map<string, PickerSeries[]>();
  for (const s of series) {
    const g = s.group || 'Other';
    const arr = groups.get(g);
    if (arr) arr.push(s);
    else groups.set(g, [s]);
  }

  // Selecting an event auto-fills a blank "Valid to" with its occurrence end + 1 day.
  const onSeries = (val: string) => {
    setSeriesId(val);
    const s = series.find((e) => e.value === val);
    if (s?.endsAt) {
      const vt = document.getElementById('validTo') as HTMLInputElement | null;
      if (vt && !vt.value) {
        const end = new Date(s.endsAt);
        end.setDate(end.getDate() + 1);
        vt.value = toLocalInput(end);
      }
    }
  };

  const radios: { key: Target; label: string }[] = [
    { key: 'brand', label: 'Brand-wide (no league or event)' },
    { key: 'sport', label: 'A league / sport' },
    { key: 'series', label: 'An event' },
  ];

  return (
    <section className="rounded-lg border p-4">
      <p className="mb-3 text-sm font-medium">This offer applies to:</p>
      <div className="flex flex-col gap-2">
        {radios.map((r) => (
          <label key={r.key} className="flex items-center gap-2 text-sm">
            <input type="radio" name="_target" checked={target === r.key} onChange={() => setTarget(r.key)} className="size-4" />
            {r.label}
          </label>
        ))}
      </div>

      {target === 'sport' ? (
        <div className="mt-3 flex flex-col gap-1.5">
          <Label htmlFor="_sportSel">League / sport</Label>
          <select id="_sportSel" value={sportId} onChange={(e) => setSportId(e.target.value)} className={SELECT_CLASS}>
            <option value="">Select a league or sport…</option>
            {sports.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      ) : null}

      {target === 'series' ? (
        <div className="mt-3 flex flex-col gap-1.5">
          <Label htmlFor="_seriesSel">Event</Label>
          <select id="_seriesSel" value={seriesId} onChange={(e) => onSeries(e.target.value)} className={SELECT_CLASS}>
            <option value="">Select an event…</option>
            {[...groups.entries()].map(([g, items]) => (
              <optgroup key={g} label={g}>
                {items.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </optgroup>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">Selecting an event auto-fills a blank “Valid to” with the event end + 1 day (override anytime).</p>
        </div>
      ) : null}

      {/* Only the active target submits a non-empty id (mutual exclusivity). */}
      <input type="hidden" name="sportId" value={target === 'sport' ? sportId : ''} />
      <input type="hidden" name="seriesId" value={target === 'series' ? seriesId : ''} />

      {errors?.length ? <p className="mt-2 text-sm text-destructive">{errors.join(' ')}</p> : null}
    </section>
  );
}
