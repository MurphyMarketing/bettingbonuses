'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import type { StateFormState } from './actions';

export type StateValues = {
  intro: string;
  regulator: string;
  regulatorUrl: string;
  problemGamblingHotline: string;
  bettingLegalStatus: string;
  legalSince: string;
};

const STATUS_OPTIONS = [
  { value: '', label: '— Unset —' },
  { value: 'legal_live', label: 'Legal — live' },
  { value: 'legal_pending', label: 'Legal — pending' },
  { value: 'tribal_only', label: 'Tribal only' },
  { value: 'illegal', label: 'Illegal' },
];

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
          <Label htmlFor="bettingLegalStatus">Betting legal status</Label>
          <select id="bettingLegalStatus" name="bettingLegalStatus" defaultValue={values.bettingLegalStatus} className="h-8 rounded-lg border bg-transparent px-2 text-sm">
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
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
