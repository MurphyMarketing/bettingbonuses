import Link from 'next/link';
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { ChevronRight } from 'lucide-react';
import { db } from '@/db';
import { brandRegions, regions, offers, offerRegions, brands, companies } from '@/db/schema';
import { formatUsdCents } from '@/lib/money';

const SITE_URL = 'https://www.bettingbonuses.com';

export async function BrandStateAvailability({
  brandId,
  brandSlug,
  brandName,
}: {
  brandId: number;
  brandSlug: string;
  brandName: string;
}) {
  const [liveRows, notAvailRows, companyRows, nationalHeadlineRows, stateOfferRows] = await Promise.all([
    db
      .select({ id: regions.id, name: regions.name, slug: regions.slug })
      .from(brandRegions)
      .innerJoin(regions, eq(brandRegions.regionId, regions.id))
      .where(and(eq(brandRegions.brandId, brandId), eq(brandRegions.isActive, true)))
      .orderBy(regions.name),
    // Regions with NO brand_regions row for this brand (anti-join; brand_regions
    // has no id column, so the null check is on brand_id).
    db
      .select({ name: regions.name })
      .from(regions)
      .leftJoin(brandRegions, and(eq(brandRegions.regionId, regions.id), eq(brandRegions.brandId, brandId)))
      .where(isNull(brandRegions.brandId))
      .orderBy(regions.name),
    db.select({ name: companies.name }).from(brands).leftJoin(companies, eq(brands.companyId, companies.id)).where(eq(brands.id, brandId)).limit(1),
    // The national headline offer — the default amount/code/min-deposit each
    // state runs unless it has its own state-specific offer. National = no
    // offer_regions rows (sql.raw for the correlated outer offers.id — Sprint H gotcha).
    db
      .select({ bonusAmountCents: offers.bonusAmountCents, code: offers.code, qualifyingDepositCents: offers.qualifyingDepositCents })
      .from(offers)
      .where(
        and(
          eq(offers.brandId, brandId),
          eq(offers.status, 'active'),
          sql`not exists (select 1 from ${offerRegions} r where r.offer_id = ${sql.raw('"offers"."id"')})`,
        ),
      )
      .orderBy(desc(offers.priority), sql`${offers.bonusAmountCents} desc nulls last`)
      .limit(1),
    // State-specific offers (amount/code/min-deposit) keyed by region, highest priority first.
    db
      .select({
        regionId: offerRegions.regionId,
        bonusAmountCents: offers.bonusAmountCents,
        code: offers.code,
        qualifyingDepositCents: offers.qualifyingDepositCents,
      })
      .from(offers)
      .innerJoin(offerRegions, eq(offerRegions.offerId, offers.id))
      .where(and(eq(offers.brandId, brandId), eq(offers.status, 'active')))
      .orderBy(desc(offers.priority), sql`${offers.bonusAmountCents} desc nulls last`),
  ]);

  // Race-condition guard: nothing to show if the brand operates nowhere.
  if (liveRows.length === 0) return null;

  const providerName = companyRows[0]?.name ?? brandName;

  // Per-state offer details: the state's own offer if it has one, else the
  // national headline offer — amount, code, and min-deposit resolved together so
  // a state never shows another state's code (e.g. Missouri's code on an Ohio
  // card). Ordered by priority, so the first row per region wins.
  type OfferVals = { bonusAmountCents: number | null; code: string | null; qualifyingDepositCents: number | null };
  const national: OfferVals | null = nationalHeadlineRows[0] ?? null;
  const stateByRegion = new Map<number, OfferVals>();
  for (const r of stateOfferRows) {
    if (!stateByRegion.has(r.regionId)) stateByRegion.set(r.regionId, r);
  }
  const offerForRegion = (regionId: number) => {
    const o = stateByRegion.get(regionId) ?? national;
    return {
      bonus: o?.bonusAmountCents != null ? formatUsdCents(o.bonusAmountCents) : null,
      code: o?.code ?? null,
    };
  };

  const serviceLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: brandName,
    provider: { '@type': 'Organization', name: providerName },
    serviceType: 'Sports betting',
    areaServed: liveRows.map((r) => ({ '@type': 'State', name: r.name, url: `${SITE_URL}/${brandSlug}/${r.slug}/` })),
  };
  const jsonLd = JSON.stringify(serviceLd).replace(/</g, '\\u003c');

  return (
    <section className="mt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <h2 className="text-xl font-semibold">Where {brandName} operates</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Live in {liveRows.length} state{liveRows.length === 1 ? '' : 's'}. Each state runs the same headline offer
        unless we note otherwise — tap a state for state-specific terms, payment options, and Responsible Gambling
        resources.
      </p>

      {/* Uniform state grid — every live state */}
      <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(0,200px))] gap-2">
        {liveRows.map((r) => {
          const off = offerForRegion(r.id);
          return (
            <Link
              key={r.slug}
              href={`/${brandSlug}/${r.slug}/`}
              className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-muted"
            >
              <span className="min-w-0">
                <span className="block font-medium">{r.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[off.bonus ? `${off.bonus} bonus` : null, off.code].filter(Boolean).join(' · ')}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>

      {/* Not yet available */}
      {notAvailRows.length ? (
        <p className="mt-6 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Not yet available:</span>{' '}
          {notAvailRows.map((r) => r.name).join(', ')}.
        </p>
      ) : null}
    </section>
  );
}
