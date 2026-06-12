import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { regions, brandRegions, brands, offers, offerRegions } from '@/db/schema';
import { Card, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OfferCard, type PublicOffer } from '@/components/offer-card';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { sanitizeHtml } from '@/lib/sanitize';

export const revalidate = 3600;
export const dynamicParams = true;

const SITE_URL = 'https://www.bettingbonuses.com';
type Params = Promise<{ 'region-slug': string }>;

// Section order for grouping brands by category.
const CATEGORY_ORDER = ['sportsbook', 'prediction_market', 'racing', 'dfs'] as const;

// Pluralized section headings for the "Operators live in {state}" listing.
const CATEGORY_SECTION_LABEL: Record<string, string> = {
  sportsbook: 'Sportsbooks',
  prediction_market: 'Prediction Markets',
  racing: 'Horse Racing',
  dfs: 'DFS',
};

/** Year cutoff for "new launch": launched within the last ~18 months. */
function newLaunchCutoffYear(): number {
  const d = new Date();
  d.setMonth(d.getMonth() - 18);
  return d.getFullYear();
}

function excerpt(html: string | null, maxWords = 55): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const words = text.split(' ');
  return words.length > maxWords ? `${words.slice(0, maxWords).join(' ')}…` : text;
}

export async function generateStaticParams() {
  // Only regions that actually have an active brand operating.
  const rows = await db
    .selectDistinct({ slug: regions.slug })
    .from(regions)
    .innerJoin(brandRegions, eq(brandRegions.regionId, regions.id))
    .innerJoin(brands, eq(brandRegions.brandId, brands.id))
    .where(and(eq(brands.status, 'active'), eq(brandRegions.isActive, true)));
  return rows.map((r) => ({ 'region-slug': r.slug }));
}

async function getRegion(slug: string) {
  const [region] = await db.select().from(regions).where(eq(regions.slug, slug)).limit(1);
  return region;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { 'region-slug': slug } = await params;
  const region = await getRegion(slug);
  if (!region) return { title: 'Not found' };
  const description = `Compare the best legal sports betting promo codes and sign-up bonuses available in ${region.name}${
    region.regulator ? `, regulated by ${region.regulator}` : ''
  }. Verified offers, updated regularly.`;
  return {
    title: `Best Sports Betting Promo Codes in ${region.name}`,
    description,
    alternates: { canonical: `/states/${region.slug}/` },
    openGraph: { title: `Best Sports Betting Promo Codes in ${region.name}`, description, url: `/states/${region.slug}/`, type: 'website' },
  };
}

export default async function StatePage({ params }: { params: Params }) {
  const { 'region-slug': slug } = await params;
  const region = await getRegion(slug);
  if (!region) notFound();

  const brandRows = await db
    .select({
      id: brands.id,
      slug: brands.slug,
      name: brands.name,
      category: brands.category,
      logoSquareUrl: brands.logoSquareUrl,
      logoUrl: brands.logoUrl,
      launchYear: brandRegions.launchYear,
      isNewLaunch: brandRegions.isNewLaunch,
      context: brandRegions.context,
    })
    .from(brands)
    .innerJoin(brandRegions, eq(brandRegions.brandId, brands.id))
    .where(and(eq(brandRegions.regionId, region.id), eq(brandRegions.isActive, true), eq(brands.status, 'active')))
    .orderBy(brands.name);

  if (brandRows.length === 0) notFound(); // no brands operate here

  const brandIds = brandRows.map((b) => b.id);
  const offerRows = await db
    .select({
      id: offers.id,
      headline: offers.headline,
      bonusKind: offers.bonusKind,
      code: offers.code,
      bonusAmountCents: offers.bonusAmountCents,
      termsSummary: offers.termsSummary,
      responsibleGamblingDisclaimer: offers.responsibleGamblingDisclaimer,
      validFrom: offers.validFrom,
      validTo: offers.validTo,
      lastVerifiedAt: offers.lastVerifiedAt,
      brandSlug: brands.slug,
    })
    .from(offers)
    .innerJoin(brands, eq(offers.brandId, brands.id))
    .where(
      and(
        inArray(offers.brandId, brandIds),
        eq(offers.status, 'active'),
        // offer targets this region OR has no region restriction (brand-wide)
        sql`(exists (select 1 from ${offerRegions} r where r.offer_id = ${offers.id} and r.region_id = ${region.id}) or not exists (select 1 from ${offerRegions} r where r.offer_id = ${offers.id}))`,
      ),
    )
    .orderBy(desc(offers.priority), desc(offers.lastVerifiedAt));

  const hotline = region.problemGamblingHotline ?? '1-800-GAMBLER';
  const legalSince = region.bettingLegalDate
    ? region.bettingLegalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const cutoffYear = newLaunchCutoffYear();
  const withNew = brandRows.map((b) => ({
    ...b,
    isNew: b.isNewLaunch ?? (b.launchYear != null && b.launchYear >= cutoffYear),
  }));
  const byCategory = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    featured: withNew.filter((b) => b.category === cat && b.isNew),
    rest: withNew.filter((b) => b.category === cat && !b.isNew),
  })).filter((g) => g.featured.length + g.rest.length > 0);

  const offerForCard = (o: (typeof offerRows)[number]): PublicOffer => ({
    id: o.id,
    headline: o.headline,
    bonusKind: o.bonusKind,
    code: o.code,
    bonusAmountCents: o.bonusAmountCents,
    termsSummary: o.termsSummary,
    responsibleGamblingDisclaimer: o.responsibleGamblingDisclaimer,
    validTo: o.validTo,
    lastVerifiedAt: o.lastVerifiedAt,
  });

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Betting promos in ${region.name}`,
    itemListElement: brandRows.map((b, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: { '@type': 'Product', name: b.name, url: `${SITE_URL}/${b.slug}/${region.slug}/` },
    })),
  };
  const placeLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: region.name,
    address: { '@type': 'PostalAddress', addressRegion: region.code, addressCountry: 'US' },
  };
  const jsonLd = JSON.stringify([itemListLd, placeLd]).replace(/</g, '\\u003c');

  return (
    <div className="py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <p className="text-sm text-muted-foreground">
        <Link href="/states/" className="hover:underline">States</Link> / {region.name}
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">
        Best Sports Betting Promo Codes in {region.name}
      </h1>

      {/* State intro (admin-authored) */}
      {region.intro ? (
        <div
          className="mt-4 max-w-2xl leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_h2]:mt-4 [&_h2]:font-semibold [&_h2]:text-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(region.intro) }}
        />
      ) : null}

      {/* Region context */}
      <p className="mt-3 max-w-2xl text-muted-foreground">
        {region.regulator || legalSince ? (
          <>
            Sports betting in {region.name}
            {legalSince ? ` has been legal since ${legalSince}` : ' is available'}
            {region.regulator ? (
              <>
                , regulated by{' '}
                {region.regulatorUrl ? (
                  <a href={region.regulatorUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    {region.regulator}
                  </a>
                ) : (
                  region.regulator
                )}
              </>
            ) : null}
            .{' '}
          </>
        ) : null}
        Compare current sign-up offers from every operator live in {region.name}.
      </p>

      {/* Brands by category */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">Operators live in {region.name}</h2>
        <div className="flex flex-col gap-8">
          {byCategory.map((group) => (
            <div key={group.category}>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">{CATEGORY_SECTION_LABEL[group.category] ?? group.category}</h3>

              {/* Featured new launches */}
              {group.featured.length ? (
                <div className="mb-4 flex flex-col gap-4">
                  {group.featured.map((b) => {
                    const ex = excerpt(b.context);
                    return (
                      <Card key={b.slug} className="flex flex-col gap-3 border-2 border-primary/60 p-4 sm:flex-row sm:items-start">
                        <BrandLogo
                          name={b.name}
                          slug={b.slug}
                          logoUrl={b.logoUrl}
                          logoSquareUrl={b.logoSquareUrl}
                          className="w-full shrink-0 sm:w-[180px]"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base">
                              <Link href={`/${b.slug}/${region.slug}/`} className="hover:underline">{b.name}</Link>
                            </CardTitle>
                            <Badge>New launch</Badge>
                            {b.launchYear ? <span className="text-xs text-muted-foreground">Live since {b.launchYear}</span> : null}
                          </div>
                          {ex ? <p className="mt-2 text-sm text-muted-foreground">{ex}</p> : null}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : null}

              {/* Established operators */}
              {group.rest.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.rest.map((b) => (
                    <Card key={b.slug} className="flex flex-col gap-3 p-3">
                      <BrandLogo
                        name={b.name}
                        slug={b.slug}
                        logoUrl={b.logoUrl}
                        logoSquareUrl={b.logoSquareUrl}
                      />
                      <CardTitle className="text-base">
                        <Link href={`/${b.slug}/${region.slug}/`} className="hover:underline">{b.name}</Link>
                      </CardTitle>
                    </Card>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {/* Offers */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold">{region.name} betting offers</h2>
        {offerRows.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {offerRows.map((o) => (
              <OfferCard key={o.id} offer={offerForCard(o)} brandSlug={o.brandSlug} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No current offers for {region.name}. Check back soon.</p>
        )}
      </section>

      {/* Responsible gambling */}
      <section className="mt-10 rounded-lg border bg-muted/30 p-4">
        <h2 className="text-sm font-semibold">Responsible gambling resources</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          If you or someone you know has a gambling problem, call{' '}
          <a href={`tel:${hotline.replace(/[^0-9]/g, '')}`} className="font-medium underline underline-offset-2">{hotline}</a>
          . 21+. Please gamble responsibly.
        </p>
      </section>
    </div>
  );
}
