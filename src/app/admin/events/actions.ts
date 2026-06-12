'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { eventSeries } from '@/db/schema';
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
    sportId: str('sportId'),
    startsAt: str('startsAt'),
    endsAt: str('endsAt'),
    location: str('location'),
    intro: str('intro'),
    description: str('description'),
  };
}

/** datetime-local string -> Date (local), or null when blank. NaN when invalid. */
function parseDate(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return d;
}

async function resolveSlug(name: string, slug: string, excludeId?: number): Promise<string> {
  const base = slugify(slug || name) || 'event';
  let candidate = base;
  for (let i = 2; ; i++) {
    const existing = await db.select({ id: eventSeries.id }).from(eventSeries).where(eq(eventSeries.slug, candidate)).limit(1);
    if (!existing[0] || existing[0].id === excludeId) return candidate;
    candidate = `${base}-${i}`;
  }
}

function validate(p: ReturnType<typeof parse>): { startsAt: Date | null; endsAt: Date | null } | { error: string } {
  if (!p.name) return { error: 'Name is required.' };
  const startsAt = parseDate(p.startsAt);
  const endsAt = parseDate(p.endsAt);
  if (startsAt && Number.isNaN(startsAt.getTime())) return { error: 'Starts-at is not a valid date.' };
  if (endsAt && Number.isNaN(endsAt.getTime())) return { error: 'Ends-at is not a valid date.' };
  if (startsAt && endsAt && endsAt.getTime() <= startsAt.getTime()) return { error: 'Ends-at must be after starts-at.' };
  return { startsAt, endsAt };
}

export async function createEvent(_prev: EventFormState, fd: FormData): Promise<EventFormState> {
  const p = parse(fd);
  const v = validate(p);
  if ('error' in v) return v;
  const slug = await resolveSlug(p.name, p.slug);
  await db.insert(eventSeries).values({
    name: p.name,
    slug,
    sportId: p.sportId ? Number(p.sportId) : null,
    startsAt: v.startsAt,
    endsAt: v.endsAt,
    location: p.location || null,
    intro: p.intro || null,
    description: p.description || null,
  });
  revalidatePath('/admin/events');
  redirect('/admin/events');
}

export async function updateEvent(id: number, _prev: EventFormState, fd: FormData): Promise<EventFormState> {
  const p = parse(fd);
  const v = validate(p);
  if ('error' in v) return v;
  const slug = await resolveSlug(p.name, p.slug, id);
  await db
    .update(eventSeries)
    .set({
      name: p.name,
      slug,
      sportId: p.sportId ? Number(p.sportId) : null,
      startsAt: v.startsAt,
      endsAt: v.endsAt,
      location: p.location || null,
      intro: p.intro || null,
      description: p.description || null,
      updatedAt: new Date(),
    })
    .where(eq(eventSeries.id, id));
  revalidatePath('/admin/events');
  revalidatePath(`/${slug}/`);
  redirect('/admin/events');
}

export async function deleteEvent(id: number): Promise<void> {
  await db.delete(eventSeries).where(eq(eventSeries.id, id));
  revalidatePath('/admin/events');
  redirect('/admin/events');
}
