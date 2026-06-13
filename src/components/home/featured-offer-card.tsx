import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { PromoCode } from '@/components/promo-code';
import { formatBonusAmount } from '@/lib/money';
import { isStale, formatRelativeTime } from '@/lib/datetime';
import { bonusKindLabel } from '@/app/admin/offers/labels';
import { ds } from '@/design/tokens';
import { cn } from '@/lib/utils';

export type FeaturedHomeOffer = {
  headline: string;
  bonusKind: string;
  code: string | null;
  bonusAmountCents: number | null;
  lastVerifiedAt: Date | null;
  brandName: string;
  brandSlug: string;
  brandLogoUrl: string | null;
  brandLogoSquareUrl: string | null;
  availableStates: number;
};

/** Homepage hero offer — same design language as the shared OfferCard's featured
 *  variant (ticket surface, accent hairline, tinted bonus badge, big amount,
 *  accent CTA), plus the homepage-only "Editor's pick" tag and state-availability
 *  line. */
export function FeaturedOfferCard({ offer }: { offer: FeaturedHomeOffer }) {
  const verifiedStale = isStale(offer.lastVerifiedAt);
  return (
    <article className={cn(ds.surface, 'ring-2 ring-action/60')}>
      <span aria-hidden="true" className={ds.topEdge} />

      <div className="flex flex-col gap-card p-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <BrandLogo
            name={offer.brandName}
            slug={offer.brandSlug}
            logoUrl={offer.brandLogoUrl}
            logoSquareUrl={offer.brandLogoSquareUrl}
            className="w-32 shrink-0 ring-1 ring-foreground/10"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Editor’s pick</Badge>
            <span className={ds.bonusBadge}>{bonusKindLabel(offer.bonusKind)}</span>
          </div>
        </div>

        <h3 className="font-display text-lg font-semibold tracking-tight text-balance text-foreground">
          {offer.headline}
        </h3>

        {offer.bonusAmountCents != null ? (
          <p className={ds.amountLg}>{formatBonusAmount(offer.bonusAmountCents)}</p>
        ) : null}

        {offer.code ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className={ds.eyebrow}>Promo code</span>
            <PromoCode code={offer.code} />
          </div>
        ) : null}

        <a href={`/go/${offer.brandSlug}`} rel="nofollow sponsored" className={ds.cta}>
          Claim bonus
          <ArrowRight className="size-4 transition-transform group-hover/offer:translate-x-0.5" aria-hidden="true" />
        </a>

        <p className="flex flex-wrap items-center gap-1.5 border-t border-foreground/5 pt-3 text-xs text-muted-foreground">
          <CheckCircle2 className={cn('size-3.5', verifiedStale ? 'text-muted-foreground' : 'text-action')} aria-hidden="true" />
          {offer.lastVerifiedAt ? `Verified ${formatRelativeTime(offer.lastVerifiedAt)}` : 'Recently added'}
          {offer.availableStates > 0 ? <> · available in {offer.availableStates} state{offer.availableStates === 1 ? '' : 's'}</> : null}
        </p>
      </div>
    </article>
  );
}
