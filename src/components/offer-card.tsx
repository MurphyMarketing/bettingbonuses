import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatUsdCents } from '@/lib/money';
import { isStale, formatRelativeTime } from '@/lib/datetime';
import { bonusKindLabel } from '@/app/admin/offers/labels';

export type PublicOffer = {
  id: number;
  headline: string;
  bonusKind: string;
  code: string | null;
  bonusAmountCents: number | null;
  termsSummary: string | null;
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

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {offer.code ? (
            <span>
              Code: <code className="rounded bg-muted px-1 py-0.5 font-mono text-foreground">{offer.code}</code>
            </span>
          ) : null}
          {expires ? <span>Expires {expires}</span> : null}
        </div>

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
      </CardContent>
    </Card>
  );
}
