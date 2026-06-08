'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { articles, authors } from '@/db/schema';
import { isValidSlug, slugify } from '@/lib/slug';
import { slugTaken } from '@/lib/slug-check';
import { getStorage, publicUrl, ARTICLE_IMAGE_BUCKET } from '@/lib/storage';
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
        // Explicit save supersedes any autosaved draft.
        draftBody: null,
        draftUpdatedAt: null,
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

/** Autosave the current editor HTML to draft_body (every ~30s from the form). */
export async function saveArticleDraft(id: string, htmlBody: string): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session) return { ok: false };
  await db.update(articles).set({ draftBody: htmlBody, draftUpdatedAt: new Date() }).where(eq(articles.id, id));
  return { ok: true };
}

/** Discard the autosaved draft. */
export async function discardArticleDraft(id: string): Promise<{ ok: boolean }> {
  const session = await auth();
  if (!session) return { ok: false };
  await db.update(articles).set({ draftBody: null, draftUpdatedAt: null }).where(eq(articles.id, id));
  revalidatePath(`/admin/articles/${id}/edit`);
  return { ok: true };
}

const ARTICLE_IMAGE_MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ARTICLE_IMAGE_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Upload an inline editor image to the article-images bucket; returns its URL. */
export async function uploadArticleImage(formData: FormData): Promise<{ url?: string; error?: string }> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'No file provided.' };
  if (file.size > ARTICLE_IMAGE_MAX_BYTES) return { error: 'Image is larger than 2MB.' };
  const ext = ARTICLE_IMAGE_EXT[file.type];
  if (!ext) return { error: 'Image must be PNG, JPEG, WebP, or GIF.' };

  const objectPath = `${crypto.randomUUID()}.${ext}`;
  const { error } = await getStorage()
    .from(ARTICLE_IMAGE_BUCKET)
    .upload(objectPath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) return { error: `Upload failed: ${error.message}` };

  return { url: publicUrl(ARTICLE_IMAGE_BUCKET, objectPath) };
}

/** Soft delete: archive rather than remove. */
export async function archiveArticle(id: string): Promise<void> {
  await db.update(articles).set({ status: 'archived', updatedAt: new Date() }).where(eq(articles.id, id));
  revalidatePath('/admin/articles');
  redirect('/admin/articles');
}
