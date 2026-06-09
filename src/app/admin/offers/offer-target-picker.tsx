'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';

export type PickerSport = { value: string; label: string };
export type PickerSeries = { value: string; label: string; group: string };
export type PickerEvent = { value: string; label: string; endsAt: string | null };

type Target = 'brand' | 'sport' | 'series' | 'event';

const SELECT_CLASS = 'h-9 w-full rounded-lg border bg-transparent px-2 text-sm';

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Nested "this offer applies to" picker. Mutual exclusivity is enforced by the
 * radio + the three hidden inputs (only the active target submits a non-empty
 * id). The server action also guards (offers_single_target CHECK is live).
 */
export function OfferTargetPicker({
  sports,
  series,
  events,
  defaultSportId,
  defaultSeriesId,
  defaultEventId,
  errors,
}: {
  sports: PickerSport[];
  series: PickerSeries[];
  events: PickerEvent[];
  defaultSportId: string;
  defaultSeriesId: string;
  defaultEventId: string;
  errors?: string[];
}) {
  const initial: Target = defaultEventId ? 'event' : defaultSeriesId ? 'series' : defaultSportId ? 'sport' : 'brand';
  const [target, setTarget] = useState<Target>(initial);
  const [sportId, setSportId] = useState(defaultSportId);
  const [seriesId, setSeriesId] = useState(defaultSeriesId);
  const [eventId, setEventId] = useState(defaultEventId);

  const groups = new Map<string, PickerSeries[]>();
  for (const s of series) {
    const g = s.group || 'Other';
    const arr = groups.get(g);
    if (arr) arr.push(s);
    else groups.set(g, [s]);
  }

  const onEvent = (val: string) => {
    setEventId(val);
    const ev = events.find((e) => e.value === val);
    if (ev?.endsAt) {
      const vt = document.getElementById('validTo') as HTMLInputElement | null;
      if (vt && !vt.value) {
        const end = new Date(ev.endsAt);
        end.setDate(end.getDate() + 1);
        vt.value = toLocalInput(end);
      }
    }
  };

  const radios: { key: Target; label: string }[] = [
    { key: 'brand', label: 'Brand-wide (all sports, no specific event)' },
    { key: 'sport', label: 'A specific sport' },
    { key: 'series', label: 'An event series' },
    { key: 'event', label: 'A specific event' },
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
          <Label htmlFor="_sportSel">Sport</Label>
          <select id="_sportSel" value={sportId} onChange={(e) => setSportId(e.target.value)} className={SELECT_CLASS}>
            <option value="">Select a sport…</option>
            {sports.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      ) : null}

      {target === 'series' ? (
        <div className="mt-3 flex flex-col gap-1.5">
          <Label htmlFor="_seriesSel">Event series</Label>
          <select id="_seriesSel" value={seriesId} onChange={(e) => setSeriesId(e.target.value)} className={SELECT_CLASS}>
            <option value="">Select a series…</option>
            {[...groups.entries()].map(([g, items]) => (
              <optgroup key={g} label={g}>
                {items.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      ) : null}

      {target === 'event' ? (
        <div className="mt-3 flex flex-col gap-1.5">
          <Label htmlFor="_eventSel">Event</Label>
          <select id="_eventSel" value={eventId} onChange={(e) => onEvent(e.target.value)} className={SELECT_CLASS}>
            <option value="">Select an event…</option>
            {events.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">Selecting an event auto-fills a blank “Valid to” with the event end + 1 day (override anytime).</p>
        </div>
      ) : null}

      {/* Only the active target submits a non-empty id (mutual exclusivity). */}
      <input type="hidden" name="sportId" value={target === 'sport' ? sportId : ''} />
      <input type="hidden" name="seriesId" value={target === 'series' ? seriesId : ''} />
      <input type="hidden" name="eventId" value={target === 'event' ? eventId : ''} />

      {errors?.length ? <p className="mt-2 text-sm text-destructive">{errors.join(' ')}</p> : null}
    </section>
  );
}
