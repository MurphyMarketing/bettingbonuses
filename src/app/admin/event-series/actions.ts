'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { eventSeries } from '@/db/schema';
import { slugify } from '@/lib/slug';

export type SeriesFormState = { error?: string };

function parse(fd: FormData) {
  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  return { name: str('name'), slug: str('slug'), sportId: str('sportId'), intro: str('intro'), description: str('description') };
}

async function resolveSlug(name: string, slug: string, excludeId?: number): Promise<string> {
  const base = slugify(slug || name) || 'series';
  let candidate = base;
  for (let i = 2; ; i++) {
    const existing = await db.select({ id: eventSeries.id }).from(eventSeries).where(eq(eventSeries.slug, candidate)).limit(1);
    if (!existing[0] || existing[0].id === excludeId) return candidate;
    candidate = `${base}-${i}`;
  }
}

export async function createSeries(_prev: SeriesFormState, fd: FormData): Promise<SeriesFormState> {
  const p = parse(fd);
  if (!p.name) return { error: 'Name is required.' };
  const slug = await resolveSlug(p.name, p.slug);
  await db.insert(eventSeries).values({
    name: p.name,
    slug,
    sportId: p.sportId ? Number(p.sportId) : null,
    intro: p.intro || null,
    description: p.description || null,
  });
  revalidatePath('/admin/event-series');
  redirect('/admin/event-series');
}

export async function updateSeries(id: number, _prev: SeriesFormState, fd: FormData): Promise<SeriesFormState> {
  const p = parse(fd);
  if (!p.name) return { error: 'Name is required.' };
  const slug = await resolveSlug(p.name, p.slug, id);
  await db
    .update(eventSeries)
    .set({ name: p.name, slug, sportId: p.sportId ? Number(p.sportId) : null, intro: p.intro || null, description: p.description || null, updatedAt: new Date() })
    .where(eq(eventSeries.id, id));
  revalidatePath('/admin/event-series');
  revalidatePath(`/${slug}/`);
  redirect('/admin/event-series');
}

export async function deleteSeries(id: number): Promise<void> {
  await db.delete(eventSeries).where(eq(eventSeries.id, id));
  revalidatePath('/admin/event-series');
  redirect('/admin/event-series');
}
