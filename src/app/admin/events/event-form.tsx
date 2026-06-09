'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { slugify } from '@/lib/slug';
import type { EventFormState } from './actions';

export type EventFormValues = {
  name: string;
  slug: string;
  seriesId: string;
  startsAt: string; // datetime-local value
  endsAt: string;
  description: string;
  location: string;
};
export type SeriesOption = { id: number; name: string };

export function EventForm({
  action,
  values,
  series,
  submitLabel,
}: {
  action: (prev: EventFormState, fd: FormData) => Promise<EventFormState>;
  values: EventFormValues;
  series: SeriesOption[];
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
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="seriesId">Event series</Label>
          <select id="seriesId" name="seriesId" required defaultValue={values.seriesId} className="h-8 rounded-lg border bg-transparent px-2 text-sm">
            <option value="">Select a series…</option>
            {series.map((s) => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startsAt">Starts at</Label>
          <Input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={values.startsAt} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="endsAt">Ends at</Label>
          <Input id="endsAt" name="endsAt" type="datetime-local" required defaultValue={values.endsAt} />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" placeholder="Levi's Stadium, Santa Clara, CA" defaultValue={values.location} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} defaultValue={values.description} />
      </div>

      <div><Button type="submit" disabled={pending}>{pending ? 'Saving…' : submitLabel}</Button></div>
    </form>
  );
}
