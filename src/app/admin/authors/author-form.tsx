'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { slugify } from '@/lib/slug';
import type { AuthorFormState } from './schema';

export type AuthorFormValues = {
  name: string;
  slug: string;
  title: string;
  credentials: string;
  bio: string;
  avatarUrl: string;
  isActive: boolean;
  displayOrder: string;
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

export function AuthorForm({
  action,
  values,
  submitLabel,
}: {
  action: (prev: AuthorFormState, formData: FormData) => Promise<AuthorFormState>;
  values: AuthorFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const errs = state.errors ?? {};
  const [name, setName] = useState(values.name);
  const [slug, setSlug] = useState(values.slug);
  const [slugEdited, setSlugEdited] = useState(Boolean(values.slug));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {errs._form?.length ? <p role="alert" className="text-sm text-destructive">{errs._form.join(' ')}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="name" errors={errs.name}>
          <Input id="name" name="name" required value={name} onChange={(e) => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} />
        </Field>
        <Field label="Slug" htmlFor="slug" errors={errs.slug} hint="Used at /authors/[slug].">
          <Input id="slug" name="slug" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }} />
        </Field>
        <Field label="Title" htmlFor="title" errors={errs.title} hint="e.g. Co-founder, BettingBonuses.com">
          <Input id="title" name="title" defaultValue={values.title} />
        </Field>
        <Field label="Avatar URL" htmlFor="avatarUrl" errors={errs.avatarUrl}>
          <Input id="avatarUrl" name="avatarUrl" type="url" defaultValue={values.avatarUrl} />
        </Field>
        <Field label="Display order" htmlFor="displayOrder" errors={errs.displayOrder}>
          <Input id="displayOrder" name="displayOrder" type="number" inputMode="numeric" defaultValue={values.displayOrder} />
        </Field>
      </div>

      <Field label="Credentials" htmlFor="credentials" errors={errs.credentials} hint="e.g. Regulated online betting industry since 2008">
        <Input id="credentials" name="credentials" defaultValue={values.credentials} />
      </Field>

      <Field label="Bio (Markdown)" htmlFor="bio" errors={errs.bio}>
        <Textarea id="bio" name="bio" rows={6} defaultValue={values.bio} />
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
