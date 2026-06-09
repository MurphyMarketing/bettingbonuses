import { and, desc, eq, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { offers, brands } from '@/db/schema';
import type { PublicOffer } from '@/components/offer-card';

export type OfferCardRow = { offer: PublicOffer; brandSlug: string };

/** Active offers matching `condition`, joined to their brand, priority-sorted —
 *  shaped for <OfferCard>. Used by the sport / series / event hubs. */
export async function activeOfferCards(condition: SQL | undefined): Promise<OfferCardRow[]> {
  const rows = await db
    .select({
      id: offers.id,
      headline: offers.headline,
      bonusKind: offers.bonusKind,
      code: offers.code,
      bonusAmountCents: offers.bonusAmountCents,
      termsSummary: offers.termsSummary,
      responsibleGamblingDisclaimer: offers.responsibleGamblingDisclaimer,
      validTo: offers.validTo,
      lastVerifiedAt: offers.lastVerifiedAt,
      brandSlug: brands.slug,
    })
    .from(offers)
    .innerJoin(brands, eq(offers.brandId, brands.id))
    .where(condition ? and(eq(offers.status, 'active'), condition) : eq(offers.status, 'active'))
    .orderBy(desc(offers.priority), desc(offers.lastVerifiedAt));

  return rows.map((r) => ({
    brandSlug: r.brandSlug,
    offer: {
      id: r.id,
      headline: r.headline,
      bonusKind: r.bonusKind,
      code: r.code,
      bonusAmountCents: r.bonusAmountCents,
      termsSummary: r.termsSummary,
      responsibleGamblingDisclaimer: r.responsibleGamblingDisclaimer,
      validTo: r.validTo,
      lastVerifiedAt: r.lastVerifiedAt,
    },
  }));
}
