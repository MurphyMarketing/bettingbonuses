import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { pageContent } from '@/db/schema';

/** Admin-authored rich slots for a hub/index page, by page_key. Missing row -> empty. */
export async function getPageContent(pageKey: string): Promise<{ introBody: string | null; body: string | null }> {
  const [row] = await db
    .select({ introBody: pageContent.introBody, body: pageContent.body })
    .from(pageContent)
    .where(eq(pageContent.pageKey, pageKey))
    .limit(1);
  return row ?? { introBody: null, body: null };
}

/** Admin SEO overrides for a hub/index page, by page_key. Missing row -> nulls. */
export async function getPageMeta(pageKey: string): Promise<{ metaTitle: string | null; metaDescription: string | null }> {
  const [row] = await db
    .select({ metaTitle: pageContent.metaTitle, metaDescription: pageContent.metaDescription })
    .from(pageContent)
    .where(eq(pageContent.pageKey, pageKey))
    .limit(1);
  return row ?? { metaTitle: null, metaDescription: null };
}
