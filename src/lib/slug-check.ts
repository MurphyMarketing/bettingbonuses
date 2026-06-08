import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db';
import { brands, articles } from '@/db/schema';

/**
 * Root-level slugs (brand pages and articles) share one URL namespace, so a slug
 * must be unique across BOTH tables. Pass the row being edited to exclude itself.
 */
export async function slugTaken(
  slug: string,
  opts: { exceptBrandId?: number; exceptArticleId?: string } = {},
): Promise<boolean> {
  const [b] = await db
    .select({ id: brands.id })
    .from(brands)
    .where(opts.exceptBrandId != null ? and(eq(brands.slug, slug), ne(brands.id, opts.exceptBrandId)) : eq(brands.slug, slug))
    .limit(1);
  if (b) return true;

  const [a] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(opts.exceptArticleId != null ? and(eq(articles.slug, slug), ne(articles.id, opts.exceptArticleId)) : eq(articles.slug, slug))
    .limit(1);
  return Boolean(a);
}
