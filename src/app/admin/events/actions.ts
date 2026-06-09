'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { events, eventSeries } from '@/db/schema';
import { slugify } from '@/lib/slug';

export type EventFormState = { error?: string };

function parse(fd: FormData) {
  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  return {
    name: str('name'),
    slug: str('slug'),
    seriesId: str('seriesId'),
    startsAt: str('startsAt'),
    endsAt: str('endsAt'),
    description: str('description'),
    location: str('location'),
  };
}

async function resolveSlug(name: string, slug: string, excludeId?: number): Promise<string> {
  const base = slugify(slug || name) || 'event';
  let candidate = base;
  for (let i = 2; ; i++) {
    const existing = await db.select({ id: events.id }).from(events).where(eq(events.slug, candidate)).limit(1);
    if (!existing[0] || existing[0].id === excludeId) return candidate;
    candidate = `${base}-${i}`;
  }
}

async function validateAndBuild(p: ReturnType<typeof parse>) {
  if (!p.name) return { error: 'Name is required.' as const };
  if (!p.seriesId) return { error: 'Select an event series.' as const };
  if (!p.startsAt || !p.endsAt) return { error: 'Start and end times are required.' as const };
  const startsAt = new Date(p.startsAt);
  const endsAt = new Date(p.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return { error: 'Invalid date/time.' as const };
  if (endsAt < startsAt) return { error: 'End must be after start.' as const };
  const seriesId = Number(p.seriesId);
  const [series] = await db.select({ sportId: eventSeries.sportId }).from(eventSeries).where(eq(eventSeries.id, seriesId)).limit(1);
  return {
    values: {
      name: p.name,
      seriesId,
      sportId: series?.sportId ?? null, // keep events.sport_id consistent with the series
      startsAt,
      endsAt,
      description: p.description || null,
      location: p.location || null,
    },
  };
}

export async function createEvent(_prev: EventFormState, fd: FormData): Promise<EventFormState> {
  const p = parse(fd);
  const r = await validateAndBuild(p);
  if ('error' in r) return { error: r.error };
  const slug = await resolveSlug(p.name, p.slug);
  await db.insert(events).values({ ...r.values, slug });
  revalidatePath('/admin/events');
  redirect('/admin/events');
}

export async function updateEvent(id: number, _prev: EventFormState, fd: FormData): Promise<EventFormState> {
  const p = parse(fd);
  const r = await validateAndBuild(p);
  if ('error' in r) return { error: r.error };
  const slug = await resolveSlug(p.name, p.slug, id);
  await db.update(events).set({ ...r.values, slug, updatedAt: new Date() }).where(eq(events.id, id));
  revalidatePath('/admin/events');
  redirect('/admin/events');
}

export async function deleteEvent(id: number): Promise<void> {
  await db.delete(events).where(eq(events.id, id));
  revalidatePath('/admin/events');
  redirect('/admin/events');
}
