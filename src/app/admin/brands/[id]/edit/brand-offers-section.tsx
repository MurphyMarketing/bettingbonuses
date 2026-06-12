import Link from 'next/link';
import { asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { offers, offerRegions, regions } from '@/db/schema';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatUsdCents } from '@/lib/money';
import { formatRelativeTime } from '@/lib/datetime';
import { bonusKindLabel, offerStatusLabel, OFFER_STATUS_BADGE_VARIANT } from '@/app/admin/offers/labels';

/**
 * Per-brand offers list on the brand edit page. Lets you see a brand's whole
 * offer set (and therefore its bonus types) and add another without leaving the
 * brand. Rows link to the existing offer edit page; inline editing is out of scope.
 */
export async function BrandOffersSection({ brandId }: { brandId: number }) {
  const offerRows = await db
    .select({
      id: offers.id,
      headline: offers.headline,
      bonusKind: offers.bonusKind,
      isFeatured: offers.isFeatured,
      status: offers.status,
      bonusAmountCents: offers.bonusAmountCents,
      lastVerifiedAt: offers.lastVerifiedAt,
      // National = no offer_regions rows. sql.raw for the correlated reference to
      // the outer offers.id (Sprint H gotcha: the ${offers.id} placeholder is
      // mis-bound inside this subquery here).
      isNational: sql<boolean>`not exists (select 1 from ${offerRegions} r where r.offer_id = ${sql.raw('"offers"."id"')})`,
    })
    .from(offers)
    .where(eq(offers.brandId, brandId))
    // Featured first, then active before draft, then amount desc within.
    .orderBy(
      desc(offers.isFeatured),
      sql`case when ${offers.status} = 'active' then 0 when ${offers.status} = 'draft' then 1 else 2 end`,
      sql`${offers.bonusAmountCents} desc nulls last`,
    );

  // Region names for region-restricted offers, for the scope column.
  const offerIds = offerRows.map((o) => o.id);
  const regionRows = offerIds.length
    ? await db
        .select({ offerId: offerRegions.offerId, name: regions.name })
        .from(offerRegions)
        .innerJoin(regions, eq(offerRegions.regionId, regions.id))
        .where(inArray(offerRegions.offerId, offerIds))
        .orderBy(asc(regions.name))
    : [];
  const regionsByOffer = new Map<number, string[]>();
  for (const r of regionRows) {
    const arr = regionsByOffer.get(r.offerId) ?? [];
    arr.push(r.name);
    regionsByOffer.set(r.offerId, arr);
  }
  const scopeLabel = (o: (typeof offerRows)[number]): string => {
    if (o.isNational) return 'National';
    const names = regionsByOffer.get(o.id) ?? [];
    if (names.length === 0) return '—';
    if (names.length === 1) return names[0];
    return `${names.length} states`;
  };

  // Distinct bonus types, in display order, for the at-a-glance summary line.
  const distinctKinds = [...new Set(offerRows.map((o) => o.bonusKind))];
  const addHref = `/admin/offers/new?brandId=${brandId}`;

  return (
    <section className="mb-8 rounded-lg border p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-sm font-medium">Offers ({offerRows.length})</h2>
        <Button size="sm" render={<Link href={addHref}>Add offer</Link>} />
      </div>

      {offerRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No offers yet.</p>
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {offerRows.length} offer{offerRows.length === 1 ? '' : 's'} ·{' '}
            <span className="text-foreground">{distinctKinds.map(bonusKindLabel).join(', ')}</span>
          </p>

          <ul className="flex flex-col divide-y rounded-md border">
            {offerRows.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/offers/${o.id}/edit`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3 hover:bg-muted"
                >
                  <span className="min-w-0 flex-1 basis-64">
                    <span className="block truncate font-medium">{o.headline}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{bonusKindLabel(o.bonusKind)}</Badge>
                      {o.isFeatured ? <Badge>Featured</Badge> : null}
                      <Badge variant={OFFER_STATUS_BADGE_VARIANT[o.status] ?? 'secondary'}>
                        {offerStatusLabel(o.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{scopeLabel(o)}</span>
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm tabular-nums">
                    <span className="block font-medium">{formatUsdCents(o.bonusAmountCents)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {o.lastVerifiedAt ? `verified ${formatRelativeTime(o.lastVerifiedAt)}` : 'never verified'}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
