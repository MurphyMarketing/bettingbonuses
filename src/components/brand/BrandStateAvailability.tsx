import Link from 'next/link';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { ChevronRight } from 'lucide-react';
import { db } from '@/db';
import { brandRegions, regions, offers, brands, companies } from '@/db/schema';
import { Badge } from '@/components/ui/badge';
import { formatUsdCents } from '@/lib/money';

const SITE_URL = 'https://www.bettingbonuses.com';

/** Year cutoff for "new launch": launched within the last ~18 months. */
function newLaunchCutoffYear(): number {
  const d = new Date();
  d.setMonth(d.getMonth() - 18);
  return d.getFullYear();
}

function excerpt(html: string | null, maxWords = 120): string | null {
  if (!html) return null;
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const words = text.split(' ');
  return words.length > maxWords ? `${words.slice(0, maxWords).join(' ')}…` : text;
}

export async function BrandStateAvailability({
  brandId,
  brandSlug,
  brandName,
  brandHeadlineOffer,
}: {
  brandId: number;
  brandSlug: string;
  brandName: string;
  brandHeadlineOffer: string | null;
}) {
  const cutoffYear = newLaunchCutoffYear();

  const [liveRows, notAvailRows, topOfferRows, companyRows] = await Promise.all([
    db
      .select({
        name: regions.name,
        slug: regions.slug,
        regulator: regions.regulator,
        context: brandRegions.context,
        headlineOverride: brandRegions.headlineOverride,
        launchYear: brandRegions.launchYear,
        isNewLaunch: brandRegions.isNewLaunch,
      })
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
    db
      .select({ bonusAmountCents: offers.bonusAmountCents, code: offers.code, qualifyingDepositCents: offers.qualifyingDepositCents })
      .from(offers)
      .where(and(eq(offers.brandId, brandId), eq(offers.status, 'active')))
      .orderBy(desc(offers.priority))
      .limit(1),
    db.select({ name: companies.name }).from(brands).leftJoin(companies, eq(brands.companyId, companies.id)).where(eq(brands.id, brandId)).limit(1),
  ]);

  // Race-condition guard: nothing to show if the brand operates nowhere.
  if (liveRows.length === 0) return null;

  const topOffer = topOfferRows[0];
  const bonus = topOffer?.bonusAmountCents != null ? formatUsdCents(topOffer.bonusAmountCents) : null;
  const code = topOffer?.code ?? null;
  const minDeposit = topOffer?.qualifyingDepositCents != null ? formatUsdCents(topOffer.qualifyingDepositCents) : null;
  const providerName = companyRows[0]?.name ?? brandName;

  const rows = liveRows.map((r) => ({ ...r, isNew: r.isNewLaunch ?? (r.launchYear != null && r.launchYear >= cutoffYear) }));
  const featured = rows.filter((r) => r.isNew); // already alphabetical from the query
  const established = rows.filter((r) => !r.isNew);

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

      <h2 className="text-xl font-semibold">{brandName} by state</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Live in {liveRows.length} state{liveRows.length === 1 ? '' : 's'}. Each state runs the same headline offer
        unless we note otherwise — tap a state for state-specific terms, payment options, and Responsible Gambling
        resources.
      </p>

      {/* Featured new-launch cards */}
      {featured.length ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {featured.map((r) => {
            const ex = excerpt(r.context);
            return (
              <div key={r.slug} className="rounded-lg border-2 border-primary/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/${brandSlug}/${r.slug}/`} className="text-lg font-semibold hover:underline">
                    {r.name}
                  </Link>
                  <Badge>New launch</Badge>
                </div>
                {r.launchYear ? <p className="mt-0.5 text-xs text-muted-foreground">Live since {r.launchYear}</p> : null}
                {ex ? <p className="mt-2 text-sm text-muted-foreground">{ex}</p> : null}
                <p className="mt-2 text-sm font-medium">{r.headlineOverride || brandHeadlineOffer}</p>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Promo code: <span className="font-medium text-foreground">{code ?? '—'}</span></span>
                  <span>Min deposit: <span className="font-medium text-foreground">{minDeposit ?? '—'}</span></span>
                  <span>Regulator: <span className="font-medium text-foreground">{r.regulator ?? '—'}</span></span>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Established-state grid */}
      {established.length ? (
        <div className="mt-6">
          <p className="mb-2 text-sm font-medium">Other live states</p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(0,200px))] gap-2">
            {established.map((r) => (
              <Link
                key={r.slug}
                href={`/${brandSlug}/${r.slug}/`}
                className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block font-medium">{r.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[bonus ? `${bonus} bonus` : null, code, r.launchYear].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      ) : null}

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
