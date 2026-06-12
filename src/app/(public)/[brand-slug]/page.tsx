import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { brands, articles, eventSeries } from '@/db/schema';
import { getVisibleBrand, brandMetadata, BrandView } from './brand-view';
import { getPublishedArticle, articleMetadata, ArticleView } from './article-view';
import { getVisibleSeries, seriesMetadata, SeriesView } from './series-view';
import { CATEGORIES, isCategorySlug, categoryHubMetadata, CategoryHub } from '@/components/category/category-hub';

export const revalidate = 3600; // ISR: 1 hour
export const dynamicParams = true;

// NOTE: this single root dynamic segment serves brand pages, articles, event
// series hubs, AND the four category hubs. Next.js forbids two differently-named
// dynamic segments at one position and all live at the URL root, so the slug is
// resolved here in a fixed fallback order:
//   brand -> article -> event series -> category -> 404.
// Brand keeps absolute priority; category is LAST so it can never shadow a brand/
// article/series. Slug uniqueness across those tables is enforced at write time,
// and the four category slugs are verified collision-free against them.
type Params = Promise<{ 'brand-slug': string }>;

export async function generateStaticParams() {
  const [brandRows, articleRows, seriesRows] = await Promise.all([
    db.select({ slug: brands.slug }).from(brands).where(inArray(brands.status, ['active', 'rebranded'])),
    db.select({ slug: articles.slug }).from(articles).where(eq(articles.status, 'published')),
    db.select({ slug: eventSeries.slug }).from(eventSeries),
  ]);
  return [
    ...brandRows,
    ...articleRows,
    ...seriesRows,
    ...Object.keys(CATEGORIES).map((slug) => ({ slug })),
  ].map((r) => ({ 'brand-slug': r.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { 'brand-slug': slug } = await params;
  const brand = await getVisibleBrand(slug);
  if (brand) return brandMetadata(brand);
  const article = await getPublishedArticle(slug);
  if (article) return articleMetadata(article);
  const series = await getVisibleSeries(slug);
  if (series) return seriesMetadata(series);
  const categoryMeta = categoryHubMetadata(slug);
  if (categoryMeta) return categoryMeta;
  return { title: 'Not found' };
}

export default async function RootSlugPage({ params }: { params: Params }) {
  const { 'brand-slug': slug } = await params;

  const brand = await getVisibleBrand(slug);
  if (brand) return <BrandView brand={brand} />;

  const article = await getPublishedArticle(slug);
  if (article) return <ArticleView article={article} />;

  const series = await getVisibleSeries(slug);
  if (series) return <SeriesView series={series} />;

  if (isCategorySlug(slug)) return <CategoryHub categorySlug={slug} />;

  notFound();
}
