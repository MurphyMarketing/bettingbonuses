'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { isValidSlug, slugify } from '@/lib/slug';
import { authorSchema, authorFormToRaw, toFieldErrors, type AuthorFormState, type AuthorInput } from './schema';

function toColumns(data: AuthorInput, slug: string) {
  return {
    name: data.name,
    slug,
    title: data.title ?? null,
    credentials: data.credentials ?? null,
    bio: data.bio ?? null,
    avatarUrl: data.avatarUrl ?? null,
    isActive: data.isActive,
    displayOrder: data.displayOrder,
  };
}

// Author slugs are their own namespace (/authors/[slug]); unique within authors.
async function resolveSlug(data: AuthorInput, excludeId?: string) {
  const slug = data.slug ?? slugify(data.name);
  if (!slug || !isValidSlug(slug)) {
    return { errors: { slug: ['Could not derive a valid slug from the name — enter one manually'] } };
  }
  const where = excludeId ? and(eq(authors.slug, slug), ne(authors.id, excludeId)) : eq(authors.slug, slug);
  const [clash] = await db.select({ id: authors.id }).from(authors).where(where).limit(1);
  if (clash) return { errors: { slug: ['That slug is already in use'] } };
  return { slug };
}

export async function createAuthor(_prev: AuthorFormState, formData: FormData): Promise<AuthorFormState> {
  const parsed = authorSchema.safeParse(authorFormToRaw(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const slugResult = await resolveSlug(parsed.data);
  if ('errors' in slugResult) return slugResult;

  try {
    await db.insert(authors).values(toColumns(parsed.data, slugResult.slug));
  } catch {
    return { errors: { _form: ['Could not save the author. Please try again.'] } };
  }
  revalidatePath('/admin/authors');
  redirect('/admin/authors');
}

export async function updateAuthor(id: string, _prev: AuthorFormState, formData: FormData): Promise<AuthorFormState> {
  const parsed = authorSchema.safeParse(authorFormToRaw(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const slugResult = await resolveSlug(parsed.data, id);
  if ('errors' in slugResult) return slugResult;

  try {
    await db.update(authors).set({ ...toColumns(parsed.data, slugResult.slug), updatedAt: new Date() }).where(eq(authors.id, id));
  } catch {
    return { errors: { _form: ['Could not save the author. Please try again.'] } };
  }
  revalidatePath('/admin/authors');
  revalidatePath(`/authors/${slugResult.slug}/`);
  redirect('/admin/authors');
}

/** Soft delete: deactivate (is_active=false) rather than remove. */
export async function deactivateAuthor(id: string): Promise<void> {
  await db.update(authors).set({ isActive: false, updatedAt: new Date() }).where(eq(authors.id, id));
  revalidatePath('/admin/authors');
  redirect('/admin/authors');
}
