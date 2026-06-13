import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { offers, offerRegions, users } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { centsToDollarInput } from '@/lib/money';
import { isStale, formatRelativeTime, toDatetimeLocalInput } from '@/lib/datetime';
import { updateOffer, softDeleteOffer, verifyOffer } from '../../actions';
import { OfferForm, type OfferFormValues } from '../../offer-form';
import { loadOptions } from '../../new/page';
import { ASSIGNABLE_BONUS_KIND_VALUES, USER_SEGMENT_VALUES, OFFER_STATUS_VALUES } from '../../schema';

export const metadata: Metadata = { title: 'Edit offer', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function EditOfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [offer] = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
  if (!offer) notFound();

  const [options, regionRows, verifier] = await Promise.all([
    loadOptions(),
    db.select({ regionId: offerRegions.regionId }).from(offerRegions).where(eq(offerRegions.offerId, id)),
    offer.verifiedByUserId
      ? db.select({ email: users.email }).from(users).where(eq(users.id, offer.verifiedByUserId)).limit(1)
      : Promise.resolve([] as { email: string }[]),
  ]);

  const values: OfferFormValues = {
    brandId: String(offer.brandId),
    bonusKind: offer.bonusKind,
    userSegment: offer.userSegment,
    seriesId: offer.seriesId != null ? String(offer.seriesId) : '',
    sportId: offer.sportId != null ? String(offer.sportId) : '',
    code: offer.code ?? '',
    headline: offer.headline,
    description: offer.description ?? '',
    bonusAmountCents: centsToDollarInput(offer.bonusAmountCents),
    bonusMaxCents: centsToDollarInput(offer.bonusMaxCents),
    qualifyingDepositCents: centsToDollarInput(offer.qualifyingDepositCents),
    qualifyingBetCents: centsToDollarInput(offer.qualifyingBetCents),
    wageringRequirementMultiplier: offer.wageringRequirementMultiplier != null ? String(offer.wageringRequirementMultiplier) : '',
    termsUrl: offer.termsUrl ?? '',
    termsSummary: offer.termsSummary ?? '',
    responsibleGamblingDisclaimer: offer.responsibleGamblingDisclaimer ?? '',
    affiliateUrl: offer.affiliateUrl ?? '',
    isExclusive: offer.isExclusive,
    validFrom: toDatetimeLocalInput(offer.validFrom),
    validTo: toDatetimeLocalInput(offer.validTo),
    verificationNotes: offer.verificationNotes ?? '',
    priority: String(offer.priority),
    isFeatured: offer.isFeatured,
    status: offer.status,
    attributes: offer.attributes != null ? JSON.stringify(offer.attributes, null, 2) : '',
  };

  const verifierEmail = verifier[0]?.email;
  const stale = isStale(offer.lastVerifiedAt);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href="/admin/offers" className="text-sm text-muted-foreground hover:underline">← Offers</Link>
        <h1 className="mt-1 text-2xl font-semibold">{offer.headline}</h1>
      </div>

      {/* One-click verify — top of the form, no confirmation, no extra fields. */}
      <div className="mb-8 flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
        <div className="text-sm">
          {offer.lastVerifiedAt ? (
            <span className={stale ? 'text-destructive' : 'text-muted-foreground'}>
              Last verified {formatRelativeTime(offer.lastVerifiedAt)}
              {verifierEmail ? ` by ${verifierEmail}` : ''}
            </span>
          ) : (
            <span className="text-muted-foreground">Never verified</span>
          )}
          {stale ? <Badge variant="destructive" className="ml-2">Stale</Badge> : null}
        </div>
        <form action={verifyOffer.bind(null, id)}>
          <Button type="submit">Verify now</Button>
        </form>
      </div>

      <OfferForm
        action={updateOffer.bind(null, id)}
        brands={options.brands}
        series={options.series}
        sports={options.sports}
        regions={options.regions}
        selectedRegionIds={regionRows.map((r) => String(r.regionId))}
        bonusKinds={ASSIGNABLE_BONUS_KIND_VALUES}
        userSegments={USER_SEGMENT_VALUES}
        statuses={OFFER_STATUS_VALUES}
        values={values}
        submitLabel="Save changes"
      />

      {offer.status !== 'archived' ? (
        <div className="mt-10 border-t pt-6">
          <h2 className="text-sm font-medium">Danger zone</h2>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Soft delete sets the status to “Archived”. The offer is hidden from listings but preserved.
          </p>
          <form action={softDeleteOffer.bind(null, id)}>
            <Button type="submit" variant="destructive">Archive this offer</Button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
