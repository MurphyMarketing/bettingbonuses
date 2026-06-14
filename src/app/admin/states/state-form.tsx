'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import type { StateFormState } from './actions';

export type MarketKey = 'sportsbook' | 'prediction' | 'dfs' | 'racing';

export const MARKETS: { key: MarketKey; label: string }[] = [
  { key: 'sportsbook', label: 'Sportsbook' },
  { key: 'prediction', label: 'Prediction' },
  { key: 'dfs', label: 'DFS' },
  { key: 'racing', label: 'Racing' },
];

// Mirrors the market_legal_status enum (schema.ts). '' = not set (NULL).
export const MARKET_STATUS_OPTIONS = [
  { value: '', label: '— Not set —' },
  { value: 'legal', label: 'Legal' },
  { value: 'not_yet_live', label: 'Legal — not yet live' },
  { value: 'illegal', label: 'Illegal' },
  { value: 'unregulated', label: 'Unregulated' },
  { value: 'contested', label: 'Available — contested' },
  { value: 'retail_only', label: 'Retail only (in-person)' },
];

export type StateValues = {
  intro: string;
  regulator: string;
  regulatorUrl: string;
  problemGamblingHotline: string;
  legalSince: string;
  // Per-market status + min age, keyed by market. Values are strings for form use.
  markets: Record<MarketKey, { status: string; minAge: string }>;
};

export function StateForm({
  action,
  values,
}: {
  action: (prev: StateFormState, formData: FormData) => Promise<StateFormState>;
  values: StateValues;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex flex-col gap-1.5">
        <Label>State intro</Label>
        <p className="text-xs text-muted-foreground">Shown below the H1 on the public state page.</p>
        <RichTextEditor name="intro" defaultValue={values.intro} placeholder="Intro for this state…" />
      </div>

      {/* Per-market legal status + minimum age */}
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Legal status by market</legend>
        <p className="text-xs text-muted-foreground">
          Legality is per-market. Leave a status unset where a market isn’t offered or isn’t known yet.
          The prediction-market regulator (CFTC) is site-wide, not per-state.
        </p>
        <div className="overflow-hidden rounded-lg border">
          <div className="grid grid-cols-[8rem_1fr_6rem] items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>Market</span>
            <span>Status</span>
            <span>Min age</span>
          </div>
          {MARKETS.map((m) => (
            <div key={m.key} className="grid grid-cols-[8rem_1fr_6rem] items-center gap-2 border-b px-3 py-2 last:border-b-0">
              <Label htmlFor={`${m.key}Status`} className="text-sm">{m.label}</Label>
              <select
                id={`${m.key}Status`}
                name={`${m.key}Status`}
                defaultValue={values.markets[m.key].status}
                className="h-8 rounded-lg border bg-transparent px-2 text-sm"
              >
                {MARKET_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <Input
                id={`${m.key}MinAge`}
                name={`${m.key}MinAge`}
                type="number"
                inputMode="numeric"
                min={18}
                max={99}
                defaultValue={values.markets[m.key].minAge}
                aria-label={`${m.label} minimum age`}
                placeholder="—"
                className="h-8"
              />
            </div>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="regulator">Regulator name</Label>
          <Input id="regulator" name="regulator" defaultValue={values.regulator} placeholder="Missouri Gaming Commission" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="regulatorUrl">Regulator URL</Label>
          <Input id="regulatorUrl" name="regulatorUrl" type="url" defaultValue={values.regulatorUrl} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="problemGamblingHotline">Problem gambling hotline</Label>
          <Input id="problemGamblingHotline" name="problemGamblingHotline" defaultValue={values.problemGamblingHotline} placeholder="1-800-GAMBLER" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="legalSince">Legal since</Label>
          <Input id="legalSince" name="legalSince" type="date" defaultValue={values.legalSince} />
        </div>
      </div>

      <div>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  );
}
