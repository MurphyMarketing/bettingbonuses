'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { slugify } from '@/lib/slug';
import type { EventFormState } from './actions';

export type EventFormValues = {
  name: string;
  slug: string;
  sportId: string;
  startsAt: string;
  endsAt: string;
  location: string;
  intro: string;
  description: string;
};
export type SportOption = { id: number; name: string };

export function EventForm({
  action,
  values,
  sports,
  submitLabel,
}: {
  action: (prev: EventFormState, fd: FormData) => Promise<EventFormState>;
  values: EventFormValues;
  sports: SportOption[];
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
          <p className="text-xs text-muted-foreground">Top-level: /{slug || '…'}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sportId">League / sport</Label>
          <select id="sportId" name="sportId" defaultValue={values.sportId} className="h-8 rounded-lg border bg-transparent px-2 text-sm">
            <option value="">—</option>
            {sports.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {/* Current / next occurrence (rolled forward yearly). Leave blank for evergreen. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startsAt">Starts at</Label>
          <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={values.startsAt} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endsAt">Ends at</Label>
          <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={values.endsAt} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" defaultValue={values.location} placeholder="Churchill Downs, Louisville, KY" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={values.description} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Intro</Label>
        <RichTextEditor name="intro" defaultValue={values.intro} placeholder="Event hub intro…" />
      </div>

      <div><Button type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button></div>
    </form>
  );
}
