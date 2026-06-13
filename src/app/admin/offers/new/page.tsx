import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { brands, eventSeries, regions, sports } from '@/db/schema';
import { createOffer } from '../actions';
import { OfferForm, type OfferFormValues } from '../offer-form';
import { ASSIGNABLE_BONUS_KIND_VALUES, USER_SEGMENT_VALUES, OFFER_STATUS_VALUES } from '../schema';

export const metadata: Metadata = { title: 'New offer', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const EMPTY: OfferFormValues = {
  brandId: '', bonusKind: '', userSegment: 'new', seriesId: '', sportId: '',
  code: '', headline: '', description: '', bonusAmountCents: '', bonusMaxCents: '',
  qualifyingDepositCents: '', qualifyingBetCents: '', wageringRequirementMultiplier: '',
  termsUrl: '', termsSummary: '', responsibleGamblingDisclaimer: '', affiliateUrl: '', isExclusive: false, validFrom: '',
  validTo: '', verificationNotes: '', priority: '0', isFeatured: false, status: 'draft', attributes: '',
};

export async function loadOptions() {
  const [brandRows, seriesRows, sportRows, regionRows] = await Promise.all([
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    // Events (event_series) carry their sport name (for grouping) and current
    // occurrence end (for the picker's auto-valid-to).
    db
      .select({ id: eventSeries.id, name: eventSeries.name, sportName: sports.name, endsAt: eventSeries.endsAt })
      .from(eventSeries)
      .leftJoin(sports, eq(eventSeries.sportId, sports.id))
      .orderBy(asc(sports.displayOrder), asc(eventSeries.name)),
    db.select({ id: sports.id, name: sports.name }).from(sports).orderBy(asc(sports.displayOrder), asc(sports.name)),
    db.select({ id: regions.id, code: regions.code, name: regions.name }).from(regions).orderBy(asc(regions.name)),
  ]);
  return {
    brands: brandRows.map((b) => ({ value: String(b.id), label: b.name })),
    series: seriesRows.map((s) => ({ value: String(s.id), label: s.name, group: s.sportName ?? 'Other', endsAt: s.endsAt ? s.endsAt.toISOString() : null })),
    sports: sportRows.map((s) => ({ value: String(s.id), label: s.name })),
    regions: regionRows.map((r) => ({ value: String(r.id), label: `${r.name} (${r.code})` })),
  };
}

export default async function NewOfferPage({
  searchParams,
}: {
  searchParams: Promise<{ brandId?: string }>;
}) {
  const [options, { brandId }] = await Promise.all([loadOptions(), searchParams]);

  // Pre-select the brand when arriving from a brand page (?brandId=…). Only honor
  // a brandId that actually exists in the picker; otherwise fall back to standalone.
  const preselectBrandId = brandId && options.brands.some((b) => b.value === brandId) ? brandId : '';
  const values = preselectBrandId ? { ...EMPTY, brandId: preselectBrandId } : EMPTY;
  const backHref = preselectBrandId ? `/admin/brands/${preselectBrandId}/edit` : '/admin/offers';

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href={backHref} className="text-sm text-muted-foreground hover:underline">
          ← {preselectBrandId ? 'Brand' : 'Offers'}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">New offer</h1>
      </div>

      <OfferForm
        action={createOffer}
        brands={options.brands}
        series={options.series}
        sports={options.sports}
        regions={options.regions}
        selectedRegionIds={[]}
        bonusKinds={ASSIGNABLE_BONUS_KIND_VALUES}
        userSegments={USER_SEGMENT_VALUES}
        statuses={OFFER_STATUS_VALUES}
        values={values}
        returnToBrandId={preselectBrandId || undefined}
        submitLabel="Create offer"
      />
    </main>
  );
}
