'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { SortableArrayField } from '@/components/ui/sortable-array-field';
import { slugify } from '@/lib/slug';
import type { AuthorFormState } from './schema';

export type AuthorFormValues = {
  name: string;
  slug: string;
  title: string;
  credentials: string;
  bio: string;
  fullBio: string;
  linkedinUrl: string;
  twitterUrl: string;
  websiteUrl: string;
  email: string;
  expertiseAreas: string; // newline-joined
  yearsExperience: string;
  isActive: boolean;
  displayOrder: string;
};

const toLines = (v: string): string[] => v.split('\n').map((s) => s.trim()).filter(Boolean);

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
        <Field label="Position title" htmlFor="title" errors={errs.title} hint="e.g. Co-founder, BettingBonuses.com">
          <Input id="title" name="title" defaultValue={values.title} />
        </Field>
        <Field label="Industry start year" htmlFor="yearsExperience" errors={errs.yearsExperience} hint="e.g. 2008 — the page computes “X years experience”.">
          <Input id="yearsExperience" name="yearsExperience" type="number" inputMode="numeric" defaultValue={values.yearsExperience} />
        </Field>
        <Field label="Display order" htmlFor="displayOrder" errors={errs.displayOrder}>
          <Input id="displayOrder" name="displayOrder" type="number" inputMode="numeric" defaultValue={values.displayOrder} />
        </Field>
      </div>

      <Field label="Credentials" htmlFor="credentials" errors={errs.credentials} hint="e.g. Regulated online betting industry since 2008">
        <Input id="credentials" name="credentials" defaultValue={values.credentials} />
      </Field>

      {/* Social / contact */}
      <section className="grid grid-cols-1 gap-4 rounded-lg border p-4 sm:grid-cols-2">
        <Field label="LinkedIn URL" htmlFor="linkedinUrl" errors={errs.linkedinUrl}>
          <Input id="linkedinUrl" name="linkedinUrl" type="url" defaultValue={values.linkedinUrl} />
        </Field>
        <Field label="X / Twitter URL" htmlFor="twitterUrl" errors={errs.twitterUrl}>
          <Input id="twitterUrl" name="twitterUrl" type="url" defaultValue={values.twitterUrl} />
        </Field>
        <Field label="Website URL" htmlFor="websiteUrl" errors={errs.websiteUrl}>
          <Input id="websiteUrl" name="websiteUrl" type="url" defaultValue={values.websiteUrl} />
        </Field>
        <Field label="Public email" htmlFor="email" errors={errs.email}>
          <Input id="email" name="email" type="email" defaultValue={values.email} />
        </Field>
      </section>

      <SortableArrayField name="expertiseAreas" label="Expertise areas" hint="One per line; drag to reorder." initial={toLines(values.expertiseAreas)} />

      <Field label="Short bio" htmlFor="bio" errors={errs.bio} hint="Plain text used on bylines.">
        <Textarea id="bio" name="bio" rows={3} defaultValue={values.bio} />
      </Field>

      <div className="flex flex-col gap-1.5">
        <Label>Full bio</Label>
        <p className="text-xs text-muted-foreground">Long-form bio shown on the author page.</p>
        <RichTextEditor name="fullBio" defaultValue={values.fullBio} placeholder="Full author bio…" />
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
