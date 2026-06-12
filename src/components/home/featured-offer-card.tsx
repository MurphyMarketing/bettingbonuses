import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { PromoCode } from '@/components/promo-code';
import { formatUsdCents } from '@/lib/money';
import { isStale, formatRelativeTime } from '@/lib/datetime';
import { bonusKindLabel } from '@/app/admin/offers/labels';

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

/** Richer homepage hero offer — the already-selected national/is_featured offer,
 *  with brand logo, Editor's-pick pill, bonus-type badge, code, large amount, the
 *  national-availability line, and the Claim-bonus CTA. 2px accent border. */
export function FeaturedOfferCard({ offer }: { offer: FeaturedHomeOffer }) {
  const verifiedStale = isStale(offer.lastVerifiedAt);
  return (
    <Card className="border-2 border-primary shadow-sm">
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <BrandLogo
            name={offer.brandName}
            slug={offer.brandSlug}
            logoUrl={offer.brandLogoUrl}
            logoSquareUrl={offer.brandLogoSquareUrl}
            className="w-40 shrink-0"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Editor’s pick</Badge>
            <Badge variant="secondary">{bonusKindLabel(offer.bonusKind)}</Badge>
          </div>
        </div>

        <h3 className="text-xl font-bold tracking-tight">{offer.headline}</h3>

        {offer.bonusAmountCents != null ? (
          <p className="text-3xl font-bold">{formatUsdCents(offer.bonusAmountCents)}</p>
        ) : null}

        {offer.code ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Promo code</span>
            <PromoCode code={offer.code} />
          </div>
        ) : null}

        <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <CheckCircle2 className={`size-3.5 ${verifiedStale ? 'text-muted-foreground' : 'text-primary'}`} />
          {offer.lastVerifiedAt ? `Verified ${formatRelativeTime(offer.lastVerifiedAt)}` : 'Recently added'}
          {offer.availableStates > 0 ? <> · available in {offer.availableStates} state{offer.availableStates === 1 ? '' : 's'}</> : null}
        </p>

        <Button
          size="lg"
          className="w-full sm:w-auto"
          render={
            <a href={`/go/${offer.brandSlug}`} rel="nofollow sponsored">
              Claim bonus
            </a>
          }
        />
      </CardContent>
    </Card>
  );
}
