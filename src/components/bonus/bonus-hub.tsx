import type { Metadata } from 'next';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/db';
import { offers, bonusKindEnum } from '@/db/schema';
import { OfferCard } from '@/components/offer-card';
import { RichContent } from '@/components/rich-content';
import { activeOfferCards } from '@/lib/offer-cards';
import { getPageContent, getPageMeta } from '@/lib/page-content';
import { metaOrDefault } from '@/lib/meta';
import { ds } from '@/design/tokens';
import { cn } from '@/lib/utils';

type BonusKind = (typeof bonusKindEnum.enumValues)[number];

/**
 * Bonus-type hubs — one flat top-level page per bonus kind, aggregating active
 * offers of that kind across brands. Mirrors the category hub: page_content-backed
 * intro/body, meta override, thin-page noindex. Resolved as a step of the root
 * [brand-slug] fallback chain. Driven by this config so adding/removing a kind is
 * one edit. (free_bet / free_play are intentionally absent — legally prohibited.)
 */
export const BONUS_HUBS: Record<string, { kinds: BonusKind[]; h1: string; noun: string }> = {
  'bonus-bets': { kinds: ['bonus_bets'], h1: 'Best Bonus Bet Offers', noun: 'bonus bet' },
  'no-deposit-bonuses': { kinds: ['no_deposit_bonus'], h1: 'Best No-Deposit Bonuses', noun: 'no-deposit bonus' },
  'odds-boosts': { kinds: ['odds_boost', 'profit_boost'], h1: 'Best Odds Boosts & Profit Boosts', noun: 'odds boost' },
  cashback: { kinds: ['cashback'], h1: 'Best Cashback Offers', noun: 'cashback' },
  'deposit-bonus': { kinds: ['deposit_match'], h1: 'Best Deposit Match Bonuses', noun: 'deposit match bonus' },
  'bet-insurance': { kinds: ['bet_insurance'], h1: 'Best Bet Insurance Offers', noun: 'bet insurance' },
};

/** True if the slug is one of the bonus-type hubs. */
export function isBonusHubSlug(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(BONUS_HUBS, slug);
}

/** Metadata for a bonus hub (page_content override + template fallback + thin-page
 *  noindex when there are no active offers of the kind), or null if not a hub. */
export async function bonusHubMetadata(slug: string): Promise<Metadata | null> {
  const cfg = BONUS_HUBS[slug];
  if (!cfg) return null;
  const defaultDescription = `Compare the best ${cfg.noun} offers and promo codes from legal US sportsbooks. Verified offers, updated regularly.`;
  const [meta, [cnt]] = await Promise.all([
    getPageMeta(slug),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(offers)
      .where(and(eq(offers.status, 'active'), inArray(offers.bonusKind, cfg.kinds))),
  ]);
  const title = metaOrDefault(meta.metaTitle, cfg.h1);
  const description = metaOrDefault(meta.metaDescription, defaultDescription);
  const isThin = (cnt?.c ?? 0) === 0;
  return {
    title,
    description,
    alternates: { canonical: `/${slug}/` },
    openGraph: { title, description, url: `/${slug}/`, type: 'website' },
    ...(isThin ? { robots: { index: false, follow: true } } : {}),
  };
}

export async function BonusHub({ bonusHubSlug }: { bonusHubSlug: string }) {
  const cfg = BONUS_HUBS[bonusHubSlug];
  if (!cfg) return null; // caller guards with isBonusHubSlug; defensive only

  const [offerCards, pc] = await Promise.all([
    activeOfferCards(inArray(offers.bonusKind, cfg.kinds)),
    getPageContent(bonusHubSlug),
  ]);

  return (
    <div className="py-8">
      <h1 className={ds.pageTitle}>{cfg.h1}</h1>
      <p className={cn(ds.lead, 'mt-3')}>
        Current {cfg.noun} offers from legal US sportsbooks. Every offer is checked and dated.
      </p>

      {/* Admin-authored rich intro (above the offers) */}
      <RichContent html={pc.introBody} className="mt-6 max-w-3xl" />

      {offerCards.length ? (
        <div className="mt-8 grid gap-card sm:grid-cols-2">
          {offerCards.map((c) => (
            <OfferCard key={c.offer.id} offer={c.offer} brand={c.brand} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-muted-foreground">No current {cfg.noun} offers. Check back soon.</p>
      )}

      {/* Admin-authored rich body (below the offers) */}
      <RichContent html={pc.body} className="mt-10 max-w-3xl" />
    </div>
  );
}
