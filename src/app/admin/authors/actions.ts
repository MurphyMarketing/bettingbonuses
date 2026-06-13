'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { authors } from '@/db/schema';
import { isValidSlug, slugify } from '@/lib/slug';
import { getStorage, publicUrl, AUTHOR_AVATAR_BUCKET } from '@/lib/storage';
import { revalidatePublic } from '@/lib/revalidate-path';
import { authorSchema, authorFormToRaw, toFieldErrors, type AuthorFormState, type AuthorInput } from './schema';

function toColumns(data: AuthorInput, slug: string) {
  return {
    name: data.name,
    slug,
    title: data.title ?? null,
    credentials: data.credentials ?? null,
    bio: data.bio ?? null,
    fullBio: data.fullBio ?? null,
    // avatarUrl is owned by uploadAuthorAvatar, not this form.
    linkedinUrl: data.linkedinUrl ?? null,
    twitterUrl: data.twitterUrl ?? null,
    websiteUrl: data.websiteUrl ?? null,
    email: data.email ?? null,
    expertiseAreas: data.expertiseAreas ?? null,
    yearsExperience: data.yearsExperience ?? null,
    isActive: data.isActive,
    displayOrder: data.displayOrder,
  };
}

/* ------------------------------------------------------------------ *
 * Avatar upload
 * ------------------------------------------------------------------ */
export type AvatarUploadState = { error?: string; ok?: boolean };

const AVATAR_MAX_BYTES = 1024 * 1024; // 1MB
const AVATAR_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export async function uploadAuthorAvatar(id: string, _prev: AvatarUploadState, formData: FormData): Promise<AvatarUploadState> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  const [author] = await db.select({ slug: authors.slug }).from(authors).where(eq(authors.id, id)).limit(1);
  if (!author) return { error: 'Author not found.' };

  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) return { error: 'Choose an image to upload.' };
  if (file.size > AVATAR_MAX_BYTES) return { error: 'Avatar is larger than 1MB.' };
  const ext = AVATAR_EXT[file.type];
  if (!ext) return { error: 'Avatar must be PNG, JPEG, or WebP.' };

  const objectPath = `${author.slug}.${ext}`;
  const { error } = await getStorage()
    .from(AUTHOR_AVATAR_BUCKET)
    .upload(objectPath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: true });
  if (error) return { error: `Upload failed: ${error.message}` };

  await db.update(authors).set({ avatarUrl: `${publicUrl(AUTHOR_AVATAR_BUCKET, objectPath)}?v=${Date.now()}`, updatedAt: new Date() }).where(eq(authors.id, id));
  revalidatePath(`/admin/authors/${id}/edit`);
  revalidatePublic(`/authors/${author.slug}`);
  return { ok: true };
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
  revalidatePublic(`/authors/${slugResult.slug}`);
  redirect('/admin/authors');
}

/** Soft delete: deactivate (is_active=false) rather than remove. */
export async function deactivateAuthor(id: string): Promise<void> {
  await db.update(authors).set({ isActive: false, updatedAt: new Date() }).where(eq(authors.id, id));
  revalidatePath('/admin/authors');
  redirect('/admin/authors');
}
