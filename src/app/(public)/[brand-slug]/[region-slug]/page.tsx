import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { brands, brandRegions, offers, offerRegions, regions, eventSeries, events } from '@/db/schema';
import { Badge } from '@/components/ui/badge';
import { OfferCard, type PublicOffer } from '@/components/offer-card';
import { StateAvailabilityGrid } from '@/components/state-availability-grid';
import { sanitizeHtml } from '@/lib/sanitize';
import { categoryLabel } from '@/app/admin/brands/labels';
import { getVisibleEvent, eventMetadata, EventView } from '../event-view';

export const revalidate = 3600; // ISR: 1 hour
export const dynamicParams = true;

const SITE_URL = 'https://www.bettingbonuses.com';

type Params = Promise<{ 'brand-slug': string; 'region-slug': string }>;

export async function generateStaticParams() {
  // ONLY real brand × region combos (brand operates in region). No cartesian
  // product — invalid combos 404 rather than being prerendered.
  const rows = await db
    .select({ brandSlug: brands.slug, regionSlug: regions.slug })
    .from(brandRegions)
    .innerJoin(brands, eq(brandRegions.brandId, brands.id))
    .innerJoin(regions, eq(brandRegions.regionId, regions.id))
    .where(and(inArray(brands.status, ['active', 'rebranded']), eq(brandRegions.isActive, true)));

  // Event instances live at this same position (/[series-slug]/[event-slug]).
  // Currently 0 rows until the event seed — that's expected, not a bug.
  const eventRows = await db
    .select({ seriesSlug: eventSeries.slug, eventSlug: events.slug })
    .from(events)
    .innerJoin(eventSeries, eq(events.seriesId, eventSeries.id));

  return [
    ...rows.map((r) => ({ 'brand-slug': r.brandSlug, 'region-slug': r.regionSlug })),
    ...eventRows.map((r) => ({ 'brand-slug': r.seriesSlug, 'region-slug': r.eventSlug })),
  ];
}

/** brand + region + the brand_regions link, or null if any piece is missing
 *  (brand planned/sunset, or no operating link = invalid combo). */
async function getContext(brandSlug: string, regionSlug: string) {
  const [brand] = await db.select().from(brands).where(eq(brands.slug, brandSlug)).limit(1);
  if (!brand || brand.status === 'planned' || brand.status === 'sunset') return null;

  const [region] = await db.select().from(regions).where(eq(regions.slug, regionSlug)).limit(1);
  if (!region) return null;

  const [link] = await db
    .select({ launchedAt: brandRegions.launchedAt, context: brandRegions.context, headlineOverride: brandRegions.headlineOverride })
    .from(brandRegions)
    .where(and(eq(brandRegions.brandId, brand.id), eq(brandRegions.regionId, region.id)))
    .limit(1);
  if (!link) return null; // brand doesn't operate here -> 404

  return { brand, region, link };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { 'brand-slug': brandSlug, 'region-slug': regionSlug } = await params;
  const ctx = await getContext(brandSlug, regionSlug);
  if (!ctx) {
    const ev = await getVisibleEvent(brandSlug, regionSlug);
    if (ev) return eventMetadata(ev);
    return { title: 'Not found' };
  }
  const { brand, region } = ctx;
  const description = `Current ${brand.name} promo codes and sign-up bonuses for ${region.name} bettors${
    region.regulator ? `, regulated by ${region.regulator}` : ''
  }. Verified offer details, updated regularly.`;
  return {
    title: `${brand.name} Promo Code in ${region.name}`,
    description,
    alternates: { canonical: `/${brand.slug}/${region.slug}/` },
    openGraph: {
      title: `${brand.name} Promo Code in ${region.name}`,
      description,
      url: `/${brand.slug}/${region.slug}/`,
      type: 'website',
    },
  };
}

export default async function BrandRegionPage({ params }: { params: Params }) {
  const { 'brand-slug': brandSlug, 'region-slug': regionSlug } = await params;
  const ctx = await getContext(brandSlug, regionSlug);
  if (!ctx) {
    // Fallback: /[series-slug]/[event-slug] event instance page.
    const ev = await getVisibleEvent(brandSlug, regionSlug);
    if (ev) return <EventView series={ev.series} event={ev.event} />;
    notFound();
  }
  const { brand, region, link } = ctx;

  const [regionalOffers, otherRegions, successorRows] = await Promise.all([
    // Offers for this brand that either target this region OR have no region
    // restriction at all (apply brand-wide).
    db
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
      })
      .from(offers)
      .where(
        and(
          eq(offers.brandId, brand.id),
          eq(offers.status, 'active'),
          sql`(exists (select 1 from ${offerRegions} where ${offerRegions.offerId} = ${offers.id} and ${offerRegions.regionId} = ${region.id}) or not exists (select 1 from ${offerRegions} where ${offerRegions.offerId} = ${offers.id}))`,
        ),
      )
      .orderBy(desc(offers.priority), desc(offers.lastVerifiedAt)),
    db
      .select({ slug: regions.slug, name: regions.name, code: regions.code })
      .from(brandRegions)
      .innerJoin(regions, eq(brandRegions.regionId, regions.id))
      .where(and(eq(brandRegions.brandId, brand.id), eq(brandRegions.isActive, true), ne(regions.id, region.id)))
      .orderBy(regions.name),
    brand.status === 'rebranded'
      ? db.select({ slug: brands.slug, name: brands.name }).from(brands).where(eq(brands.rebrandedFromId, brand.id)).limit(1)
      : Promise.resolve([] as { slug: string; name: string }[]),
  ]);

  const successor = successorRows[0];
  const otherRegionSlugByCode = new Map(otherRegions.map((r) => [r.code, r.slug]));
  const hotline = region.problemGamblingHotline ?? '1-800-GAMBLER';
  const launchedOn = link.launchedAt
    ? link.launchedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const offersForCard = (o: (typeof regionalOffers)[number]): PublicOffer => ({
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

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${brand.name} (${region.name})`,
    category: categoryLabel(brand.category),
    url: `${SITE_URL}/${brand.slug}/${region.slug}/`,
    offers: regionalOffers.map((o) => ({
      '@type': 'Offer',
      name: o.headline,
      ...(o.bonusAmountCents != null
        ? { price: (o.bonusAmountCents / 100).toFixed(2), priceCurrency: 'USD' }
        : {}),
      url: `${SITE_URL}/go/${brand.slug}`,
      ...(o.validFrom ? { validFrom: o.validFrom.toISOString() } : {}),
      ...(o.validTo ? { validThrough: o.validTo.toISOString() } : {}),
      areaServed: { '@type': 'State', name: region.name },
      availability: 'https://schema.org/InStock',
    })),
  };
  const placeLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: region.name,
    address: { '@type': 'PostalAddress', addressRegion: region.code, addressCountry: 'US' },
  };
  const jsonLd = JSON.stringify([productLd, placeLd]).replace(/</g, '\\u003c');

  return (
    <div className="py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {brand.status === 'rebranded' && successor ? (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <strong>{brand.name}</strong> is now <strong>{successor.name}</strong>.{' '}
          <Link href={`/${successor.slug}/${region.slug}/`} className="font-medium text-primary underline">
            View the current {successor.name} page in {region.name} →
          </Link>
        </div>
      ) : null}

      {/* H1 (custom override or default template) */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">
          {link.headlineOverride || `${brand.name} Promo Code in ${region.name}`}
        </h1>
        <Badge variant="outline">{categoryLabel(brand.category)}</Badge>
      </div>

      {/* Region context */}
      <p className="mt-3 max-w-2xl text-muted-foreground">
        {brand.name} is available to bettors in {region.name}.
        {launchedOn ? ` ${brand.name} launched in ${region.name} on ${launchedOn}.` : ''}
        {region.regulator ? ` Sports betting in ${region.name} is regulated by ${region.regulator}.` : ''}
      </p>

      {/* Custom per brand × state copy */}
      {link.context ? (
        <div
          className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_h2]:mt-4 [&_h2]:font-semibold [&_h2]:text-foreground"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(link.context) }}
        />
      ) : null}

      {/* Filtered offers */}
      <section className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">
          {brand.name} offers in {region.name}
        </h2>
        {regionalOffers.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {regionalOffers.map((o) => (
              <OfferCard key={o.id} offer={offersForCard(o)} brandSlug={brand.slug} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            No current {brand.name} offers for {region.name}. Check back soon.
          </p>
        )}
      </section>

      {/* Other states */}
      {otherRegions.length ? (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold">Other states where {brand.name} operates</h2>
          <StateAvailabilityGrid
            codes={otherRegions.map((r) => r.code)}
            hrefFor={(code) => {
              const slug = otherRegionSlugByCode.get(code);
              return slug ? `/${brand.slug}/${slug}/` : undefined;
            }}
          />
        </section>
      ) : null}

      {/* Responsible gambling */}
      <section className="mt-10 rounded-lg border bg-muted/30 p-4">
        <h2 className="text-sm font-semibold">Responsible gambling resources</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          If you or someone you know has a gambling problem, call{' '}
          <a href={`tel:${hotline.replace(/[^0-9]/g, '')}`} className="font-medium underline underline-offset-2">
            {hotline}
          </a>
          . 21+. Please gamble responsibly.
        </p>
      </section>
    </div>
  );
}
