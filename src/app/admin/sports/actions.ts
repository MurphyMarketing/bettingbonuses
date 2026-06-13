'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { sports } from '@/db/schema';
import { slugify } from '@/lib/slug';
import { revalidatePublic } from '@/lib/revalidate-path';

export type SportFormState = { error?: string };

function parse(fd: FormData) {
  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  return { name: str('name'), slug: str('slug'), category: str('category'), displayOrder: str('displayOrder'), intro: str('intro') };
}

async function resolveSlug(name: string, slug: string, excludeId?: number): Promise<string> {
  const base = slugify(slug || name) || 'sport';
  let candidate = base;
  for (let i = 2; ; i++) {
    const existing = await db.select({ id: sports.id }).from(sports).where(eq(sports.slug, candidate)).limit(1);
    if (!existing[0] || existing[0].id === excludeId) return candidate;
    candidate = `${base}-${i}`;
  }
}

export async function createSport(_prev: SportFormState, fd: FormData): Promise<SportFormState> {
  const p = parse(fd);
  if (!p.name) return { error: 'Name is required.' };
  const slug = await resolveSlug(p.name, p.slug);
  await db.insert(sports).values({
    name: p.name,
    slug,
    category: p.category || null,
    displayOrder: p.displayOrder ? Number(p.displayOrder) : 100,
    intro: p.intro || null,
  });
  revalidatePath('/admin/sports');
  redirect('/admin/sports');
}

export async function updateSport(id: number, _prev: SportFormState, fd: FormData): Promise<SportFormState> {
  const p = parse(fd);
  if (!p.name) return { error: 'Name is required.' };
  const slug = await resolveSlug(p.name, p.slug, id);
  await db
    .update(sports)
    .set({ name: p.name, slug, category: p.category || null, displayOrder: p.displayOrder ? Number(p.displayOrder) : 100, intro: p.intro || null, updatedAt: new Date() })
    .where(eq(sports.id, id));
  revalidatePath('/admin/sports');
  revalidatePublic(`/sports/${slug}`);
  redirect('/admin/sports');
}

export async function deleteSport(id: number): Promise<void> {
  await db.delete(sports).where(eq(sports.id, id));
  revalidatePath('/admin/sports');
  redirect('/admin/sports');
}
