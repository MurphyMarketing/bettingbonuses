'use client';

import { useActionState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AffiliateLinkFormState } from './schema';

export type Option = { value: string; label: string };

export type LinkFormValues = {
  slug: string;
  brandId: string;
  offerId: string;
  destinationUrl: string;
  label: string;
  network: string;
  isActive: boolean;
  validFrom: string;
  validTo: string;
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

export function LinkForm({
  action,
  brandOptions,
  offerOptions,
  values,
  submitLabel,
}: {
  action: (prev: AffiliateLinkFormState, formData: FormData) => Promise<AffiliateLinkFormState>;
  brandOptions: Option[];
  offerOptions: Option[];
  values: LinkFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errs = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {errs._form?.length ? <p role="alert" className="text-sm text-destructive">{errs._form.join(' ')}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Slug" htmlFor="slug" errors={errs.slug} hint="The /go/[slug] path. e.g. fanduel or fanduel-mo">
          <Input id="slug" name="slug" required defaultValue={values.slug} />
        </Field>
        <Field label="Destination URL" htmlFor="destinationUrl" errors={errs.destinationUrl}>
          <Input id="destinationUrl" name="destinationUrl" type="url" required defaultValue={values.destinationUrl} />
        </Field>
        <Field label="Brand" errors={errs.brandId}>
          <Select name="brandId" defaultValue={values.brandId || undefined}>
            <SelectTrigger className="w-full"><SelectValue placeholder="Select a brand" /></SelectTrigger>
            <SelectContent>
              {brandOptions.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Offer (optional)" errors={errs.offerId}>
          <Select name="offerId" defaultValue={values.offerId || ''}>
            <SelectTrigger className="w-full"><SelectValue placeholder="— None —" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">— None —</SelectItem>
              {offerOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Label" htmlFor="label" errors={errs.label} hint="Internal note, e.g. FanDuel default">
          <Input id="label" name="label" defaultValue={values.label} />
        </Field>
        <Field label="Network" htmlFor="network" errors={errs.network} hint="e.g. Income Access, Everflow, direct">
          <Input id="network" name="network" defaultValue={values.network} />
        </Field>
        <Field label="Valid from" htmlFor="validFrom" errors={errs.validFrom}>
          <Input id="validFrom" name="validFrom" type="datetime-local" defaultValue={values.validFrom} />
        </Field>
        <Field label="Valid to" htmlFor="validTo" errors={errs.validTo} hint="After this, /go/[slug] returns 404.">
          <Input id="validTo" name="validTo" type="datetime-local" defaultValue={values.validTo} />
        </Field>
      </div>

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
