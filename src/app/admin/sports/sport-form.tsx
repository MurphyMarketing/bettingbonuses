'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { slugify } from '@/lib/slug';
import { SPORT_CATEGORIES } from './labels';
import type { SportFormState } from './actions';

export type SportFormValues = { name: string; slug: string; category: string; displayOrder: string; intro: string };

export function SportForm({
  action,
  values,
  submitLabel,
}: {
  action: (prev: SportFormState, fd: FormData) => Promise<SportFormState>;
  values: SportFormValues;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [name, setName] = useState(values.name);
  const [slug, setSlug] = useState(values.slug);
  const [slugEdited, setSlugEdited] = useState(Boolean(values.slug));

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? <p role="alert" className="text-sm text-destructive">{state.error}</p> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required value={name} onChange={(e) => { setName(e.target.value); if (!slugEdited) setSlug(slugify(e.target.value)); }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" name="slug" value={slug} onChange={(e) => { setSlug(e.target.value); setSlugEdited(true); }} />
          <p className="text-xs text-muted-foreground">/sports/{slug || '…'}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <select id="category" name="category" defaultValue={values.category} className="h-8 rounded-lg border bg-transparent px-2 text-sm">
            <option value="">—</option>
            {SPORT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="displayOrder">Display order</Label>
          <Input id="displayOrder" name="displayOrder" type="number" inputMode="numeric" defaultValue={values.displayOrder} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Intro</Label>
        <RichTextEditor name="intro" defaultValue={values.intro} placeholder="Sport hub intro…" />
      </div>

      <div><Button type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button></div>
    </form>
  );
}
