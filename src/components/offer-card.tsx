import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { BrandRating } from '@/components/brand/brand-rating';
import { PromoCode } from '@/components/promo-code';
import { OfferDisclaimer } from '@/components/offer/offer-disclaimer';
import { formatBonusAmount } from '@/lib/money';
import { isStale, formatRelativeTime } from '@/lib/datetime';
import { bonusKindLabel } from '@/app/admin/offers/labels';
import { resolveDisclaimer } from '@/lib/disclaimer';
import { ds } from '@/design/tokens';
import { cn } from '@/lib/utils';

/** Offer fields the card renders. Unchanged shape — the brand identity now
 *  arrives separately via `brand`. */
export type PublicOffer = {
  id: number;
  headline: string;
  bonusKind: string;
  code: string | null;
  bonusAmountCents: number | null;
  termsSummary: string | null;
  responsibleGamblingDisclaimer: string | null;
  validTo: Date | null;
  lastVerifiedAt: Date | null;
};

/** The brand anchor — the card's identity. `rating`/`reviewCount` are reserved
 *  (no schema field yet); BrandRating renders nothing until they're supplied. */
export type OfferCardBrand = {
  name: string;
  slug: string;
  logoUrl: string | null;
  logoSquareUrl: string | null;
  rating?: number | null;
  reviewCount?: number | null;
};

function VerifiedSignal({ at }: { at: Date | null }) {
  if (!at) {
    return <span className="text-xs text-muted-foreground">Recently added</span>;
  }
  const stale = isStale(at);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <CheckCircle2 className={cn('size-3.5', stale ? 'text-muted-foreground' : 'text-action')} aria-hidden="true" />
      Verified {formatRelativeTime(at)}
    </span>
  );
}

/**
 * Shared offer card — the anchor of the design system ("The Betting Slip").
 * Hierarchy: brand anchor → bonus-type badge + headline → amount → CTA →
 * quiet trust row. Built on the design tokens in `@/design/tokens` so the rest
 * of the site can adopt the same system next. Server component; the interactive
 * bits (PromoCode, OfferDisclaimer) are isolated client components.
 */
export function OfferCard({
  offer,
  brand,
  regionDisclaimer,
  featured = false,
}: {
  offer: PublicOffer;
  brand: OfferCardBrand;
  /** Region-tier disclaimer override (three-tier: region → offer → site-default).
   *  No caller supplies one yet; reserved for state-specific terms. */
  regionDisclaimer?: string | null;
  featured?: boolean;
}) {
  const disclaimer = resolveDisclaimer({
    regionDisclaimer,
    offerDisclaimer: offer.responsibleGamblingDisclaimer,
  });

  return (
    <article className={cn(ds.surface, featured && 'ring-2 ring-action/60')}>
      <span aria-hidden="true" className={ds.topEdge} />

      <div className="flex flex-col gap-card p-card">
        {/* 1 — Brand anchor: the card's identity. */}
        <div className="flex items-center gap-3">
          <BrandLogo
            name={brand.name}
            slug={brand.slug}
            logoUrl={brand.logoUrl}
            logoSquareUrl={brand.logoSquareUrl}
            className={cn('shrink-0 ring-1 ring-foreground/10', featured ? 'w-32' : 'w-24')}
          />
          <div className="min-w-0">
            <p className="truncate font-display font-semibold leading-tight text-foreground">
              {brand.name}
            </p>
            {/* Reserved rating slot — renders nothing until brand.rating exists. */}
            <BrandRating rating={brand.rating} reviewCount={brand.reviewCount} className="mt-1" />
          </div>
        </div>

        {/* 2 — Bonus-type badge + headline. */}
        <div className="flex flex-col gap-2">
          <span className={ds.bonusBadge}>{bonusKindLabel(offer.bonusKind)}</span>
          <h3 className={cn('text-headline text-balance text-foreground', featured && 'text-lg leading-snug')}>
            {offer.headline}
          </h3>
        </div>

        {/* 3 — The amount (read right after the brand). */}
        {offer.bonusAmountCents != null ? (
          <p className={featured ? ds.amountLg : ds.amount}>{formatBonusAmount(offer.bonusAmountCents)}</p>
        ) : null}

        {/* Promo code — click-to-copy chip. */}
        {offer.code ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className={ds.eyebrow}>Promo code</span>
            <PromoCode code={offer.code} />
          </div>
        ) : null}

        {offer.termsSummary ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{offer.termsSummary}</p>
        ) : null}

        {/* 4 — Primary CTA: THE action. */}
        <a href={`/go/${brand.slug}`} rel="nofollow sponsored" className={ds.cta}>
          Claim bonus
          <ArrowRight className="size-4 transition-transform group-hover/offer:translate-x-0.5" aria-hidden="true" />
        </a>

        {/* 5 — Quiet trust row: verified microcopy + terms affordance. */}
        <div className="flex items-center justify-between gap-3 border-t border-foreground/5 pt-3">
          <VerifiedSignal at={offer.lastVerifiedAt} />
          <OfferDisclaimer text={disclaimer} />
        </div>
      </div>
    </article>
  );
}
