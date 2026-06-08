'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import type { BrandStateFormState } from './actions';

export type BrandStateValues = {
  context: string;
  headlineOverride: string;
  launchedAt: string;
  isActive: boolean;
  notes: string;
};

export function BrandStateForm({
  action,
  values,
  headlinePlaceholder,
}: {
  action: (prev: BrandStateFormState, formData: FormData) => Promise<BrandStateFormState>;
  values: BrandStateValues;
  headlinePlaceholder: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="headlineOverride">Headline override</Label>
        <Input id="headlineOverride" name="headlineOverride" defaultValue={values.headlineOverride} placeholder={headlinePlaceholder} />
        <p className="text-xs text-muted-foreground">Leave blank to use the default: “{headlinePlaceholder}”.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>State context</Label>
        <p className="text-xs text-muted-foreground">Custom copy shown on this brand’s state page (below the launch/regulator line).</p>
        <RichTextEditor name="context" defaultValue={values.context} placeholder="e.g. FanDuel launched in Missouri on Dec 1, 2025 with…" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="launchedAt">Launched in state (date)</Label>
          <Input id="launchedAt" name="launchedAt" type="date" defaultValue={values.launchedAt} />
        </div>
        <label className="mt-7 flex items-center gap-2 text-sm">
          <input type="checkbox" name="isActive" defaultChecked={values.isActive} className="size-4" />
          Active in this state
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Internal notes</Label>
        <Textarea id="notes" name="notes" rows={2} defaultValue={values.notes} />
      </div>

      <div>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save'}</Button>
      </div>
    </form>
  );
}
