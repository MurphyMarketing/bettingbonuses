import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { brands } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';

/**
 * Category hub, rendered at the bare /[category]/ root (e.g. /sportsbooks/).
 * Resolved as the final step of the root [brand-slug] slug fallback chain
 * (brand -> article -> event-series -> category -> 404). The legacy
 * /[category]/promo-codes/ URL 301-redirects here via the redirects table, so
 * this is the single canonical page per category.
 */
export const CATEGORIES: Record<
  string,
  { category: 'sportsbook' | 'prediction_market' | 'racing' | 'dfs'; h1: string; noun: string }
> = {
  sportsbooks: { category: 'sportsbook', h1: 'Best Sportsbook Promo Codes', noun: 'sportsbook' },
  'prediction-markets': { category: 'prediction_market', h1: 'Best Prediction Market Promo Codes', noun: 'prediction market' },
  'horse-racing': { category: 'racing', h1: 'Best Horse Racing Promo Codes', noun: 'horse racing' },
  dfs: { category: 'dfs', h1: "Best DFS Pick'em Promo Codes", noun: 'DFS pick’em' },
};

/** True if the slug is one of the four category hubs. */
export function isCategorySlug(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(CATEGORIES, slug);
}

/** Metadata for a category hub, or null if the slug isn't a category. */
export function categoryHubMetadata(categorySlug: string): Metadata | null {
  const cfg = CATEGORIES[categorySlug];
  if (!cfg) return null;
  const description = `Compare the best ${cfg.noun} promo codes and sign-up bonuses from legal US operators. Verified offers, updated regularly.`;
  return {
    title: cfg.h1,
    description,
    alternates: { canonical: `/${categorySlug}/` },
    openGraph: { title: cfg.h1, description, url: `/${categorySlug}/`, type: 'website' },
  };
}

export async function CategoryHub({ categorySlug }: { categorySlug: string }) {
  const cfg = CATEGORIES[categorySlug];
  if (!cfg) return null; // caller guards with isCategorySlug; defensive only

  const categoryBrands = await db
    .select({
      slug: brands.slug,
      name: brands.name,
      shortDescription: brands.shortDescription,
      logoSquareUrl: brands.logoSquareUrl,
      logoUrl: brands.logoUrl,
    })
    .from(brands)
    .where(and(eq(brands.category, cfg.category), eq(brands.status, 'active')))
    .orderBy(asc(brands.name));

  return (
    <div className="py-8">
      <h1 className="text-3xl font-bold tracking-tight">{cfg.h1}</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Current sign-up offers from legal US {cfg.noun} operators. Every offer is checked and dated.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categoryBrands.map((b) => (
          <Card key={b.slug} className="flex flex-col">
            <CardHeader>
              <BrandLogo
                name={b.name}
                slug={b.slug}
                logoUrl={b.logoUrl}
                logoSquareUrl={b.logoSquareUrl}
                className="mb-2"
              />
              <CardTitle className="text-base">
                <Link href={`/${b.slug}/`} className="hover:underline">
                  {b.name}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {b.shortDescription ?? `Current ${b.name} promotions and bonuses.`}
              </p>
              <Button variant="outline" render={<Link href={`/${b.slug}/`}>View {b.name} offers</Link>} />
            </CardContent>
          </Card>
        ))}
      </div>

      {categoryBrands.length === 0 ? (
        <p className="mt-8 text-muted-foreground">No brands in this category yet.</p>
      ) : null}
    </div>
  );
}
