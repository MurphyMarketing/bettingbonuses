import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq, gte, sql } from 'drizzle-orm';
import { db } from '@/db';
import { brands, events, eventSeries, regions, sports } from '@/db/schema';
import { createOffer } from '../actions';
import { OfferForm, type OfferFormValues } from '../offer-form';
import { BONUS_KIND_VALUES, USER_SEGMENT_VALUES, OFFER_STATUS_VALUES } from '../schema';

export const metadata: Metadata = { title: 'New offer', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const EMPTY: OfferFormValues = {
  brandId: '', bonusKind: '', userSegment: 'new', eventId: '', seriesId: '', sportId: '',
  code: '', headline: '', description: '', bonusAmountCents: '', bonusMaxCents: '',
  qualifyingDepositCents: '', qualifyingBetCents: '', wageringRequirementMultiplier: '',
  termsUrl: '', termsSummary: '', responsibleGamblingDisclaimer: '', affiliateUrl: '', isExclusive: false, validFrom: '',
  validTo: '', verificationNotes: '', priority: '0', isFeatured: false, status: 'draft', attributes: '',
};

export async function loadOptions() {
  const [brandRows, eventRows, seriesRows, sportRows, regionRows] = await Promise.all([
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    // Events the picker offers: started within the last 30 days or upcoming, soonest first.
    db
      .select({ id: events.id, name: events.name, startsAt: events.startsAt, endsAt: events.endsAt })
      .from(events)
      .where(gte(events.startsAt, sql`now() - interval '30 days'`))
      .orderBy(asc(events.startsAt)),
    // Series carry their sport name so the picker can group by sport.
    db
      .select({ id: eventSeries.id, name: eventSeries.name, sportName: sports.name })
      .from(eventSeries)
      .leftJoin(sports, eq(eventSeries.sportId, sports.id))
      .orderBy(asc(sports.displayOrder), asc(eventSeries.name)),
    db.select({ id: sports.id, name: sports.name }).from(sports).orderBy(asc(sports.displayOrder), asc(sports.name)),
    db.select({ id: regions.id, code: regions.code, name: regions.name }).from(regions).orderBy(asc(regions.name)),
  ]);
  const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return {
    brands: brandRows.map((b) => ({ value: String(b.id), label: b.name })),
    events: eventRows.map((e) => ({ value: String(e.id), label: `${e.name} (${fmtDate(e.startsAt)})`, endsAt: e.endsAt.toISOString() })),
    series: seriesRows.map((s) => ({ value: String(s.id), label: s.name, group: s.sportName ?? 'Other' })),
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
        events={options.events}
        series={options.series}
        sports={options.sports}
        regions={options.regions}
        selectedRegionIds={[]}
        bonusKinds={BONUS_KIND_VALUES}
        userSegments={USER_SEGMENT_VALUES}
        statuses={OFFER_STATUS_VALUES}
        values={values}
        returnToBrandId={preselectBrandId || undefined}
        submitLabel="Create offer"
      />
    </main>
  );
}
