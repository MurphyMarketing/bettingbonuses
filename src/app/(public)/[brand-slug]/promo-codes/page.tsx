import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { brands } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const revalidate = 3600;
export const dynamicParams = false; // only the four known category slugs

/**
 * Category hub at /[category]/promo-codes. NOTE: this lives under the
 * [brand-slug] dynamic segment (Next.js forbids two differently-named dynamic
 * segments at the same position). "promo-codes" is a static child, so it takes
 * precedence over [brand-slug]/[region-slug] for /<x>/promo-codes. The param
 * here holds a CATEGORY slug, not a brand slug.
 */
const CATEGORIES: Record<
  string,
  { category: 'sportsbook' | 'prediction_market' | 'racing' | 'dfs'; h1: string; noun: string }
> = {
  sportsbooks: { category: 'sportsbook', h1: 'Best Sportsbook Promo Codes', noun: 'sportsbook' },
  'prediction-markets': { category: 'prediction_market', h1: 'Best Prediction Market Promo Codes', noun: 'prediction market' },
  'horse-racing': { category: 'racing', h1: 'Best Horse Racing Promo Codes', noun: 'horse racing' },
  dfs: { category: 'dfs', h1: "Best DFS Pick'em Promo Codes", noun: 'DFS pick’em' },
};

type Params = Promise<{ 'brand-slug': string }>;

export function generateStaticParams() {
  return Object.keys(CATEGORIES).map((slug) => ({ 'brand-slug': slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { 'brand-slug': categorySlug } = await params;
  const cfg = CATEGORIES[categorySlug];
  if (!cfg) return { title: 'Not found' };
  const description = `Compare the best ${cfg.noun} promo codes and sign-up bonuses from legal US operators. Verified offers, updated regularly.`;
  return {
    title: cfg.h1,
    description,
    alternates: { canonical: `/${categorySlug}/promo-codes/` },
    openGraph: { title: cfg.h1, description, url: `/${categorySlug}/promo-codes/`, type: 'website' },
  };
}

export default async function CategoryHubPage({ params }: { params: Params }) {
  const { 'brand-slug': categorySlug } = await params;
  const cfg = CATEGORIES[categorySlug];
  if (!cfg) notFound();

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
              <div className="mb-2 flex size-10 items-center justify-center overflow-hidden rounded-md bg-muted text-sm font-semibold text-muted-foreground">
                {b.logoSquareUrl || b.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- static logo asset
                  <img
                    src={(b.logoSquareUrl ?? b.logoUrl)!}
                    alt={`${b.name} logo`}
                    className="size-full object-contain"
                  />
                ) : (
                  b.name.charAt(0)
                )}
              </div>
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
