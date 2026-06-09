'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bonusKindLabel } from '../labels';
import type { BulkState } from './actions';

type Opt = { value: string; label: string };
type SeriesOpt = { value: string; label: string; group: string };
type BrandOpt = { id: number; name: string; category: string };
type TargetType = 'event' | 'series' | 'sport';

const SELECT_CLASS = 'h-9 w-full rounded-lg border bg-transparent px-2 text-sm';

export function BulkCreateForm({
  sports,
  series,
  events,
  brands,
  bonusKinds,
  action,
}: {
  sports: Opt[];
  series: SeriesOpt[];
  events: Opt[];
  brands: BrandOpt[];
  bonusKinds: readonly string[];
  action: (prev: BulkState, fd: FormData) => Promise<BulkState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [targetType, setTargetType] = useState<TargetType>('series');
  const [targetId, setTargetId] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set(brands.map((b) => b.id)));
  const [template, setTemplate] = useState('{brand} bonus');

  const seriesGroups = new Map<string, SeriesOpt[]>();
  for (const s of series) {
    const g = s.group || 'Other';
    const arr = seriesGroups.get(g);
    if (arr) arr.push(s);
    else seriesGroups.set(g, [s]);
  }

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const chosenBrands = brands.filter((b) => selected.has(b.id));
  const preview = chosenBrands.map((b) => template.replaceAll('{brand}', b.name));

  const onType = (t: TargetType) => {
    setTargetType(t);
    setTargetId('');
  };

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}

      {/* Tied to */}
      <section className="rounded-lg border p-4">
        <p className="mb-3 text-sm font-medium">Tied to:</p>
        <div className="flex flex-wrap gap-4">
          {(['event', 'series', 'sport'] as TargetType[]).map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm">
              <input type="radio" name="targetType" value={t} checked={targetType === t} onChange={() => onType(t)} className="size-4" />
              {t === 'event' ? 'Event' : t === 'series' ? 'Event series' : 'Sport'}
            </label>
          ))}
        </div>

        <div className="mt-3">
          {targetType === 'sport' ? (
            <select name="targetId" value={targetId} onChange={(e) => setTargetId(e.target.value)} className={SELECT_CLASS}>
              <option value="">Select a sport…</option>
              {sports.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          ) : targetType === 'series' ? (
            <select name="targetId" value={targetId} onChange={(e) => setTargetId(e.target.value)} className={SELECT_CLASS}>
              <option value="">Select a series…</option>
              {[...seriesGroups.entries()].map(([g, items]) => (
                <optgroup key={g} label={g}>
                  {items.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </optgroup>
              ))}
            </select>
          ) : (
            <select name="targetId" value={targetId} onChange={(e) => setTargetId(e.target.value)} className={SELECT_CLASS}>
              <option value="">Select an event…</option>
              {events.length === 0 ? <option value="" disabled>No events yet — add events first</option> : null}
              {events.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          )}
        </div>
      </section>

      {/* Brands */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label>Brands ({selected.size} selected)</Label>
          <span className="flex gap-3 text-xs">
            <button type="button" className="text-primary hover:underline" onClick={() => setSelected(new Set(brands.map((b) => b.id)))}>All</button>
            <button type="button" className="text-muted-foreground hover:underline" onClick={() => setSelected(new Set())}>None</button>
          </span>
        </div>
        <div className="grid max-h-60 grid-cols-2 gap-x-6 gap-y-1.5 overflow-y-auto rounded-lg border p-3 sm:grid-cols-3">
          {brands.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="brandIds" value={b.id} checked={selected.has(b.id)} onChange={() => toggle(b.id)} className="size-4" />
              <span className="min-w-0 truncate">{b.name} <span className="text-xs text-muted-foreground">· {b.category}</span></span>
            </label>
          ))}
        </div>
      </div>

      {/* Template + bonus type */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="headlineTemplate">Headline template</Label>
          <Input id="headlineTemplate" name="headlineTemplate" value={template} onChange={(e) => setTemplate(e.target.value)} placeholder="{brand} Super Bowl LXI bonus" />
          <p className="text-xs text-muted-foreground">Use <code>{'{brand}'}</code> as the brand-name placeholder.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bonusKind">Bonus type</Label>
          <select id="bonusKind" name="bonusKind" defaultValue="" className={SELECT_CLASS}>
            <option value="">Select a bonus type…</option>
            {bonusKinds.map((k) => <option key={k} value={k}>{bonusKindLabel(k)}</option>)}
          </select>
        </div>
      </div>

      {/* Validity */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="validFrom">Valid from</Label>
          <Input id="validFrom" name="validFrom" type="datetime-local" />
          <p className="text-xs text-muted-foreground">Blank = now.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="validTo">Valid to</Label>
          <Input id="validTo" name="validTo" type="datetime-local" />
          <p className="text-xs text-muted-foreground">Blank = event end + 1 day (event) or now + 30 days.</p>
        </div>
      </div>

      {/* Preview */}
      <div className="rounded-lg border p-4">
        <p className="mb-2 text-sm font-medium">{preview.length} offer{preview.length === 1 ? '' : 's'} will be created:</p>
        {preview.length ? (
          <ul className="max-h-40 list-disc overflow-y-auto pl-5 text-sm text-muted-foreground">
            {preview.map((h, i) => <li key={i}>{h}</li>)}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Select at least one brand.</p>
        )}
      </div>

      <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-muted-foreground">
        Bulk-create scaffolds offers in <strong>draft</strong> status. You&rsquo;ll still need to set the promo code,
        terms URL, affiliate URL, and final headline copy on each before publishing.
      </p>

      <div><Button type="submit" disabled={pending || preview.length === 0}>{pending ? 'Creating…' : `Create all (${preview.length})`}</Button></div>
    </form>
  );
}
