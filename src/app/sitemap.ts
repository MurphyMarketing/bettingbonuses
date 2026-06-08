import type { MetadataRoute } from 'next';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { brands, brandRegions, regions, articles, authors } from '@/db/schema';

export const revalidate = 3600;

const SITE_URL = 'https://www.bettingbonuses.com';
const CATEGORY_SLUGS = ['sportsbooks', 'prediction-markets', 'horse-racing', 'dfs'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [brandRows, brandRegionRows, stateRows, articleRows, authorRows] = await Promise.all([
    db
      .select({ slug: brands.slug, updatedAt: brands.updatedAt })
      .from(brands)
      .where(inArray(brands.status, ['active', 'rebranded'])),
    db
      .selectDistinct({ brandSlug: brands.slug, regionSlug: regions.slug })
      .from(brandRegions)
      .innerJoin(brands, eq(brandRegions.brandId, brands.id))
      .innerJoin(regions, eq(brandRegions.regionId, regions.id))
      .where(and(inArray(brands.status, ['active', 'rebranded']), eq(brandRegions.isActive, true))),
    db
      .selectDistinct({ slug: regions.slug })
      .from(regions)
      .innerJoin(brandRegions, eq(brandRegions.regionId, regions.id))
      .innerJoin(brands, eq(brandRegions.brandId, brands.id))
      .where(and(eq(brands.status, 'active'), eq(brandRegions.isActive, true))),
    db.select({ slug: articles.slug, updatedAt: articles.updatedAt }).from(articles).where(eq(articles.status, 'published')),
    db.select({ slug: authors.slug, updatedAt: authors.updatedAt }).from(authors).where(eq(authors.isActive, true)),
  ]);

  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE_URL}/states/`, changeFrequency: 'weekly', priority: 0.6 },
  ];

  for (const c of CATEGORY_SLUGS) {
    entries.push({ url: `${SITE_URL}/${c}/promo-codes/`, changeFrequency: 'daily', priority: 0.8 });
  }
  for (const b of brandRows) {
    entries.push({ url: `${SITE_URL}/${b.slug}/`, lastModified: b.updatedAt, changeFrequency: 'daily', priority: 0.9 });
  }
  for (const br of brandRegionRows) {
    entries.push({ url: `${SITE_URL}/${br.brandSlug}/${br.regionSlug}/`, changeFrequency: 'daily', priority: 0.7 });
  }
  for (const s of stateRows) {
    entries.push({ url: `${SITE_URL}/states/${s.slug}/`, changeFrequency: 'weekly', priority: 0.6 });
  }
  for (const a of articleRows) {
    entries.push({ url: `${SITE_URL}/${a.slug}/`, lastModified: a.updatedAt, changeFrequency: 'weekly', priority: 0.7 });
  }
  for (const au of authorRows) {
    entries.push({ url: `${SITE_URL}/authors/${au.slug}/`, lastModified: au.updatedAt, changeFrequency: 'monthly', priority: 0.4 });
  }

  return entries;
}
