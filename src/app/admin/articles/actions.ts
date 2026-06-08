'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { articles, authors } from '@/db/schema';
import { isValidSlug, slugify } from '@/lib/slug';
import { slugTaken } from '@/lib/slug-check';
import {
  articleSchema,
  articleFormToRaw,
  readingTimeMinutes,
  toFieldErrors,
  type ArticleFormState,
  type ArticleInput,
} from './schema';

async function checkAuthors(data: ArticleInput): Promise<Record<string, string[]> | null> {
  const errors: Record<string, string[]> = {};
  const [primary] = await db.select({ id: authors.id }).from(authors).where(eq(authors.id, data.primaryAuthorId)).limit(1);
  if (!primary) errors.primaryAuthorId = ['Selected author no longer exists'];
  if (data.secondaryAuthorId) {
    if (data.secondaryAuthorId === data.primaryAuthorId) {
      errors.secondaryAuthorId = ['Secondary author must differ from primary'];
    } else {
      const [secondary] = await db.select({ id: authors.id }).from(authors).where(eq(authors.id, data.secondaryAuthorId)).limit(1);
      if (!secondary) errors.secondaryAuthorId = ['Selected author no longer exists'];
    }
  }
  return Object.keys(errors).length ? errors : null;
}

// Slug must be unique across articles AND brands (shared root URL namespace).
async function resolveSlug(data: ArticleInput, excludeId?: string) {
  const slug = data.slug ?? slugify(data.title);
  if (!slug || !isValidSlug(slug)) {
    return { errors: { slug: ['Could not derive a valid slug from the title — enter one manually'] } };
  }
  if (await slugTaken(slug, { exceptArticleId: excludeId })) {
    return { errors: { slug: ['That slug is already used by another article or a brand'] } };
  }
  return { slug };
}

export async function createArticle(_prev: ArticleFormState, formData: FormData): Promise<ArticleFormState> {
  const parsed = articleSchema.safeParse(articleFormToRaw(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const data = parsed.data;

  const slugResult = await resolveSlug(data);
  if ('errors' in slugResult) return slugResult;
  const authorErrors = await checkAuthors(data);
  if (authorErrors) return { errors: authorErrors };

  try {
    await db.insert(articles).values({
      slug: slugResult.slug,
      title: data.title,
      metaDescription: data.metaDescription ?? null,
      excerpt: data.excerpt ?? null,
      body: data.body ?? null,
      category: data.category,
      primaryAuthorId: data.primaryAuthorId,
      secondaryAuthorId: data.secondaryAuthorId ?? null,
      status: data.status,
      readingTimeMinutes: readingTimeMinutes(data.body ?? null),
      publishedAt: data.status === 'published' ? new Date() : null,
    });
  } catch {
    return { errors: { _form: ['Could not save the article. Please try again.'] } };
  }

  revalidatePath('/admin/articles');
  redirect('/admin/articles');
}

export async function updateArticle(id: string, _prev: ArticleFormState, formData: FormData): Promise<ArticleFormState> {
  const parsed = articleSchema.safeParse(articleFormToRaw(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const data = parsed.data;

  const slugResult = await resolveSlug(data, id);
  if ('errors' in slugResult) return slugResult;
  const authorErrors = await checkAuthors(data);
  if (authorErrors) return { errors: authorErrors };

  const [existing] = await db.select({ publishedAt: articles.publishedAt }).from(articles).where(eq(articles.id, id)).limit(1);
  // Stamp published_at the first time it goes live; otherwise keep it.
  const publishedAt =
    data.status === 'published' ? (existing?.publishedAt ?? new Date()) : (existing?.publishedAt ?? null);

  try {
    await db
      .update(articles)
      .set({
        slug: slugResult.slug,
        title: data.title,
        metaDescription: data.metaDescription ?? null,
        excerpt: data.excerpt ?? null,
        body: data.body ?? null,
        category: data.category,
        primaryAuthorId: data.primaryAuthorId,
        secondaryAuthorId: data.secondaryAuthorId ?? null,
        status: data.status,
        readingTimeMinutes: readingTimeMinutes(data.body ?? null),
        publishedAt,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id));
  } catch {
    return { errors: { _form: ['Could not save the article. Please try again.'] } };
  }

  revalidatePath('/admin/articles');
  revalidatePath(`/${slugResult.slug}/`);
  redirect('/admin/articles');
}

/** Soft delete: archive rather than remove. */
export async function archiveArticle(id: string): Promise<void> {
  await db.update(articles).set({ status: 'archived', updatedAt: new Date() }).where(eq(articles.id, id));
  revalidatePath('/admin/articles');
  redirect('/admin/articles');
}
