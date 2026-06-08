import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatUsdCents } from '@/lib/money';
import { isStale, formatRelativeTime } from '@/lib/datetime';
import { bonusKindLabel } from '@/app/admin/offers/labels';
import { PromoCode } from '@/components/promo-code';

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

function VerifiedSignal({ at }: { at: Date | null }) {
  if (!at) {
    return <span className="text-xs text-muted-foreground">Recently added</span>;
  }
  const stale = isStale(at);
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs ${stale ? 'text-muted-foreground' : 'text-primary'}`}
    >
      <CheckCircle2 className="size-3.5" />
      Verified {formatRelativeTime(at)}
    </span>
  );
}

export function OfferCard({
  offer,
  brandSlug,
  featured = false,
}: {
  offer: PublicOffer;
  brandSlug: string;
  featured?: boolean;
}) {
  const expires = offer.validTo
    ? offer.validTo.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    <Card className={featured ? 'border-primary/40 shadow-sm' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className={featured ? 'text-xl' : 'text-base'}>{offer.headline}</CardTitle>
          <Badge variant="secondary">{bonusKindLabel(offer.bonusKind)}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {offer.bonusAmountCents != null ? (
          <p className={featured ? 'text-3xl font-bold' : 'text-xl font-semibold'}>
            {formatUsdCents(offer.bonusAmountCents)}
          </p>
        ) : null}

        {offer.termsSummary ? (
          <p className="text-sm text-muted-foreground">{offer.termsSummary}</p>
        ) : null}

        {/* Promo code — prominent, copy-to-clipboard. */}
        {offer.code ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Promo code</span>
            <PromoCode code={offer.code} />
          </div>
        ) : null}

        {expires ? (
          <p className="text-sm text-muted-foreground">Expires {expires}</p>
        ) : null}

        <div className="mt-1 flex items-center justify-between gap-3">
          <VerifiedSignal at={offer.lastVerifiedAt} />
          <Button
            size={featured ? 'lg' : 'default'}
            render={
              <a href={`/go/${brandSlug}`} rel="nofollow sponsored">
                {featured ? 'Claim bonus' : 'Get offer'}
              </a>
            }
          />
        </div>

        {offer.responsibleGamblingDisclaimer ? (
          <p className="mt-1 border-t pt-2 text-xs italic text-muted-foreground">
            {offer.responsibleGamblingDisclaimer}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
