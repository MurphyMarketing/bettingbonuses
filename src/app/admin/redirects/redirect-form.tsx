'use client';

import { useActionState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { RedirectFormState } from './schema';

export type RedirectFormValues = {
  fromPath: string;
  toPath: string;
  statusCode: string;
  isActive: boolean;
  notes: string;
};

function Field({ label, htmlFor, errors, children, hint }: { label: string; htmlFor?: string; errors?: string[]; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {errors?.length ? <p className="text-sm text-destructive">{errors.join(' ')}</p> : null}
    </div>
  );
}

export function RedirectForm({
  action,
  values,
  submitLabel,
}: {
  action: (prev: RedirectFormState, formData: FormData) => Promise<RedirectFormState>;
  values: RedirectFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errs = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {errs._form?.length ? <p role="alert" className="text-sm text-destructive">{errs._form.join(' ')}</p> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="From path" htmlFor="fromPath" errors={errs.fromPath} hint="Old URL path, e.g. /racing/tvg/">
          <Input id="fromPath" name="fromPath" required defaultValue={values.fromPath} />
        </Field>
        <Field label="To path" htmlFor="toPath" errors={errs.toPath} hint="New /path or full URL, e.g. /fanduel-racing/">
          <Input id="toPath" name="toPath" required defaultValue={values.toPath} />
        </Field>
        <Field label="Status code" htmlFor="statusCode" errors={errs.statusCode} hint="301 permanent or 302 temporary.">
          <select id="statusCode" name="statusCode" defaultValue={values.statusCode || '301'} className="h-8 rounded-lg border bg-transparent px-2 text-sm">
            <option value="301">301 (permanent)</option>
            <option value="302">302 (temporary)</option>
          </select>
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes" errors={errs.notes}>
        <Textarea id="notes" name="notes" rows={2} defaultValue={values.notes} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={values.isActive} className="size-4" />
        Active
      </label>
      <div>
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button>
      </div>
    </form>
  );
}
