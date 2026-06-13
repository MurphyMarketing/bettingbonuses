import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { ShieldCheck, RefreshCw, PenLine } from 'lucide-react';
import { db } from '@/db';
import { brands, offers, offerRegions, eventSeries, regions, brandRegions } from '@/db/schema';
import { eventTimeStatus } from '@/lib/event-time';
import { FeaturedOfferCard, type FeaturedHomeOffer } from '@/components/home/featured-offer-card';
import { EventCard, type HomeEvent } from '@/components/home/event-card';
import { CategoryTile, type CategoryBrand } from '@/components/home/category-tile';
import { ds } from '@/design/tokens';
import { cn } from '@/lib/utils';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Best Betting Promo Codes & Bonuses',
  description:
    'Compare today’s best sign-up offers and promo codes from legal US sportsbooks, prediction markets, racebooks, and DFS pick’em apps — every offer carries a last-verified date.',
};

// Display slug + label + the underlying brands.category enum value.
const CATEGORIES = [
  { slug: 'sportsbooks', label: 'Sportsbooks', category: 'sportsbook' as const },
  { slug: 'prediction-markets', label: 'Prediction Markets', category: 'prediction_market' as const },
  { slug: 'horse-racing', label: 'Horse Racing', category: 'racing' as const },
  { slug: 'dfs', label: 'DFS Pick’em', category: 'dfs' as const },
];

const MAX_STATE_CHIPS = 9;

export default async function HomePage() {
  const now = new Date();
  const [featuredRows, statsRows, eventRows, brandRows, stateRows] = await Promise.all([
    // Featured: best national active offer (national is_featured -> else priority -> amount).
    // National = no offer_regions rows (sql.raw for the correlated offers.id — Sprint H gotcha).
    db
      .select({
        headline: offers.headline,
        bonusKind: offers.bonusKind,
        code: offers.code,
        bonusAmountCents: offers.bonusAmountCents,
        lastVerifiedAt: offers.lastVerifiedAt,
        brandName: brands.name,
        brandSlug: brands.slug,
        brandLogoUrl: brands.logoUrl,
        brandLogoSquareUrl: brands.logoSquareUrl,
        availableStates: sql<number>`(select count(*)::int from brand_regions br where br.brand_id = ${sql.raw('"brands"."id"')} and br.is_active = true)`,
      })
      .from(offers)
      .innerJoin(brands, eq(offers.brandId, brands.id))
      .where(
        and(
          eq(offers.status, 'active'),
          sql`not exists (select 1 from ${offerRegions} r where r.offer_id = ${sql.raw('"offers"."id"')})`,
        ),
      )
      .orderBy(desc(offers.isFeatured), desc(offers.priority), sql`${offers.bonusAmountCents} desc nulls last`)
      .limit(1),
    // Trust strip count — operation-wide (unchanged), all active offers verified in 14 days.
    db
      .select({ recent: sql<number>`count(*) filter (where ${offers.lastVerifiedAt} >= now() - interval '14 days')::int` })
      .from(offers)
      .where(eq(offers.status, 'active')),
    // Live + upcoming events: occurrence starts within 14 days, not ended > 1 day ago,
    // with a per-event active-offer count (series_id correlated subquery — Sprint H gotcha).
    db
      .select({
        name: eventSeries.name,
        slug: eventSeries.slug,
        startsAt: eventSeries.startsAt,
        endsAt: eventSeries.endsAt,
        location: eventSeries.location,
        offerCount: sql<number>`(select count(*)::int from offers o where o.series_id = ${sql.raw('"event_series"."id"')} and o.status = 'active')`,
      })
      .from(eventSeries)
      .where(sql`${eventSeries.startsAt} is not null and ${eventSeries.startsAt} <= now() + interval '14 days' and (${eventSeries.endsAt} is null or ${eventSeries.endsAt} >= now() - interval '1 day')`)
      .orderBy(asc(eventSeries.startsAt))
      .limit(3),
    // Active brands for the category logo tiles (grouped in JS).
    db
      .select({ name: brands.name, slug: brands.slug, category: brands.category, logoUrl: brands.logoUrl, logoSquareUrl: brands.logoSquareUrl })
      .from(brands)
      .where(eq(brands.status, 'active'))
      .orderBy(asc(brands.name)),
    // Best-covered states lead — order by active-brand count, capped.
    db
      .select({ slug: regions.slug, name: regions.name })
      .from(regions)
      .innerJoin(brandRegions, and(eq(brandRegions.regionId, regions.id), eq(brandRegions.isActive, true)))
      .groupBy(regions.id, regions.slug, regions.name)
      .orderBy(desc(sql`count(*)`), asc(regions.name))
      .limit(MAX_STATE_CHIPS),
  ]);

  const recent = statsRows[0]?.recent ?? 0;

  // Featured offer card data.
  const f = featuredRows[0];
  const featured: FeaturedHomeOffer | null = f
    ? {
        headline: f.headline,
        bonusKind: f.bonusKind,
        code: f.code,
        bonusAmountCents: f.bonusAmountCents,
        lastVerifiedAt: f.lastVerifiedAt,
        brandName: f.brandName,
        brandSlug: f.brandSlug,
        brandLogoUrl: f.brandLogoUrl,
        brandLogoSquareUrl: f.brandLogoSquareUrl,
        availableStates: f.availableStates,
      }
    : null;

  // Events.
  const liveUpcoming: HomeEvent[] = eventRows.map((e) => ({
    name: e.name,
    slug: e.slug,
    startsAt: e.startsAt,
    location: e.location,
    status: eventTimeStatus(e, now),
    offerCount: e.offerCount,
  }));

  // Category tiles — group active brands by category.
  const byCategory = new Map<string, CategoryBrand[]>();
  for (const b of brandRows) {
    const arr = byCategory.get(b.category) ?? [];
    arr.push({ name: b.name, slug: b.slug, logoUrl: b.logoUrl, logoSquareUrl: b.logoSquareUrl });
    byCategory.set(b.category, arr);
  }
  const categoryTiles = CATEGORIES.map((c) => {
    const all = byCategory.get(c.category) ?? [];
    return { slug: c.slug, label: c.label, brandCount: all.length, brands: all.slice(0, 4), remaining: Math.max(0, all.length - 4) };
  });

  return (
    <div className="py-10">
      {/* Hero */}
      <section>
        <h1 className={ds.pageTitle}>Find today’s best US betting offers</h1>
        <p className={cn(ds.lead, 'mt-3')}>
          Verified sign-up promotions and promo codes from legal US sportsbooks, prediction markets, racebooks, and DFS pick’em apps.
        </p>

        {/* Trust strip */}
        <div className="mt-4 inline-flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-secondary px-3.5 py-2 text-sm text-secondary-foreground">
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-action" />
            {recent > 0 ? <><span className="font-semibold">{recent}</span> verified in 14 days</> : 'Verified offers'}
          </span>
          <span className="inline-flex items-center gap-1.5"><RefreshCw className="size-4 text-action" />Checked daily</span>
          <span className="inline-flex items-center gap-1.5"><PenLine className="size-4 text-action" />Editorial review</span>
        </div>

        {/* Featured offer */}
        <div className="mt-8 max-w-xl">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Featured offer of the week</h2>
          {featured ? (
            <FeaturedOfferCard offer={featured} />
          ) : (
            <p className="text-muted-foreground">Featured offers are on the way — check back soon.</p>
          )}
        </div>
      </section>

      {/* Live and upcoming events — renders nothing when there are none */}
      {liveUpcoming.length > 0 ? (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-xl font-semibold tracking-tight">Live and upcoming events</h2>
          <div className="grid gap-card sm:grid-cols-2 lg:grid-cols-3">
            {liveUpcoming.map((e) => (
              <EventCard key={e.slug} event={e} now={now} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Browse by category — logo tiles */}
      <section className="mt-12">
        <h2 className="mb-4 font-display text-xl font-semibold tracking-tight">Browse by category</h2>
        <div className="grid gap-card sm:grid-cols-2 lg:grid-cols-4">
          {categoryTiles.map((c) => (
            <CategoryTile key={c.slug} slug={c.slug} label={c.label} brandCount={c.brandCount} brands={c.brands} remaining={c.remaining} />
          ))}
        </div>
      </section>

      {/* Browse by state — best-covered states first */}
      <section className="mt-12">
        <h2 className="mb-4 font-display text-xl font-semibold tracking-tight">Browse by state</h2>
        <ul className="flex flex-wrap gap-2">
          {stateRows.map((s) => (
            <li key={s.slug}>
              <Link href={`/states/${s.slug}/`} className="inline-block rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                {s.name}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/states/" className="inline-block rounded-md border border-dashed px-3 py-1.5 text-sm font-medium hover:bg-muted">
              All states →
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
