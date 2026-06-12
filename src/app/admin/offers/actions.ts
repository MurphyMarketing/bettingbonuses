'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { brands, events, eventSeries, offers, offerRegions, sports } from '@/db/schema';
import {
  offerSchema,
  offerFormToRaw,
  readRegionIds,
  toFieldErrors,
  type OfferFormState,
  type OfferInput,
} from './schema';

function toColumns(data: OfferInput, validTo: Date | null) {
  return {
    brandId: data.brandId,
    bonusKind: data.bonusKind,
    userSegment: data.userSegment,
    eventId: data.eventId ?? null,
    seriesId: data.seriesId ?? null,
    sportId: data.sportId ?? null,
    code: data.code ?? null,
    headline: data.headline,
    description: data.description ?? null,
    bonusAmountCents: data.bonusAmountCents,
    bonusMaxCents: data.bonusMaxCents,
    qualifyingDepositCents: data.qualifyingDepositCents,
    qualifyingBetCents: data.qualifyingBetCents,
    wageringRequirementMultiplier: data.wageringRequirementMultiplier ?? null,
    termsUrl: data.termsUrl ?? null,
    termsSummary: data.termsSummary ?? null,
    responsibleGamblingDisclaimer: data.responsibleGamblingDisclaimer ?? null,
    affiliateUrl: data.affiliateUrl ?? null,
    isExclusive: data.isExclusive,
    validFrom: data.validFrom ?? null,
    validTo,
    verificationNotes: data.verificationNotes ?? null,
    priority: data.priority,
    isFeatured: data.isFeatured,
    status: data.status,
    attributes: data.attributes ?? null,
  };
}

/** Validate FK references and apply the cross-field rules:
 *  - at least one of brand/event/series/sport (brand is required, so always ok)
 *  - if eventId set and validTo blank, default validTo to the event's endsAt
 *  - validTo (when set) must be after validFrom
 *  Returns the resolved validTo, or field errors. */
async function resolveAndCheck(
  data: OfferInput,
): Promise<{ validTo: Date | null } | { errors: Record<string, string[]> }> {
  const errors: Record<string, string[]> = {};

  if (data.brandId == null && data.eventId == null && data.seriesId == null && data.sportId == null) {
    errors._form = ['An offer must attach to at least a brand, event, series, or sport'];
  }

  // Mutual exclusivity — mirrors the offers_single_target CHECK so a violation is
  // a clean form error rather than a 500 at insert time.
  if ([data.sportId, data.seriesId, data.eventId].filter((v) => v != null).length > 1) {
    errors._form = ['An offer can target only one of: a sport, an event series, or a specific event'];
  }

  const [brand] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, data.brandId)).limit(1);
  if (!brand) errors.brandId = ['Selected brand no longer exists'];

  let eventEndsAt: Date | null = null;
  if (data.eventId != null) {
    const [ev] = await db
      .select({ id: events.id, endsAt: events.endsAt })
      .from(events)
      .where(eq(events.id, data.eventId))
      .limit(1);
    if (!ev) errors.eventId = ['Selected event no longer exists'];
    else eventEndsAt = ev.endsAt;
  }
  if (data.seriesId != null) {
    const [s] = await db.select({ id: eventSeries.id }).from(eventSeries).where(eq(eventSeries.id, data.seriesId)).limit(1);
    if (!s) errors.seriesId = ['Selected series no longer exists'];
  }
  if (data.sportId != null) {
    const [s] = await db.select({ id: sports.id }).from(sports).where(eq(sports.id, data.sportId)).limit(1);
    if (!s) errors.sportId = ['Selected sport no longer exists'];
  }

  // Default validTo to the event's end + 1 day when an event is attached and no
  // explicit end was given (matches the client picker's auto-fill).
  const validTo =
    data.validTo ?? (data.eventId != null && eventEndsAt ? new Date(eventEndsAt.getTime() + 24 * 60 * 60 * 1000) : null);

  if (data.validFrom && validTo && validTo.getTime() <= data.validFrom.getTime()) {
    errors.validTo = ['Valid-to must be after valid-from'];
  }

  if (Object.keys(errors).length) return { errors };
  return { validTo };
}

async function syncRegions(offerId: number, regionIds: number[]) {
  await db.delete(offerRegions).where(eq(offerRegions.offerId, offerId));
  if (regionIds.length) {
    await db.insert(offerRegions).values(regionIds.map((regionId) => ({ offerId, regionId }))).onConflictDoNothing();
  }
}

/** Enforce one featured offer per brand: clear is_featured on the brand's other
 *  offers so the just-saved offer is the only featured one. No-op otherwise. */
async function enforceSingleFeatured(brandId: number, keepOfferId: number) {
  await db
    .update(offers)
    .set({ isFeatured: false, updatedAt: new Date() })
    .where(and(eq(offers.brandId, brandId), ne(offers.id, keepOfferId), eq(offers.isFeatured, true)));
}

export async function createOffer(_prev: OfferFormState, formData: FormData): Promise<OfferFormState> {
  const parsed = offerSchema.safeParse(offerFormToRaw(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const data = parsed.data;
  const regionIds = readRegionIds(formData);

  const checked = await resolveAndCheck(data);
  if ('errors' in checked) return checked;

  try {
    const [created] = await db.insert(offers).values(toColumns(data, checked.validTo)).returning({ id: offers.id });
    await syncRegions(created.id, regionIds);
    if (data.isFeatured) await enforceSingleFeatured(data.brandId, created.id);
  } catch {
    return { errors: { _form: ['Could not save the offer. Please try again.'] } };
  }

  revalidatePath('/admin/offers');
  redirect('/admin/offers');
}

export async function updateOffer(id: number, _prev: OfferFormState, formData: FormData): Promise<OfferFormState> {
  const parsed = offerSchema.safeParse(offerFormToRaw(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const data = parsed.data;
  const regionIds = readRegionIds(formData);

  const checked = await resolveAndCheck(data);
  if ('errors' in checked) return checked;

  try {
    await db
      .update(offers)
      .set({ ...toColumns(data, checked.validTo), updatedAt: new Date() })
      .where(eq(offers.id, id));
    await syncRegions(id, regionIds);
    if (data.isFeatured) await enforceSingleFeatured(data.brandId, id);
  } catch {
    return { errors: { _form: ['Could not save the offer. Please try again.'] } };
  }

  revalidatePath('/admin/offers');
  revalidatePath(`/admin/offers/${id}/edit`);
  redirect('/admin/offers');
}

/** One-click verify: stamp last_verified_at = now() and the current user.
 *  No confirmation, no extra fields — this is the constant staff action. */
export async function verifyOffer(id: number): Promise<void> {
  const session = await auth();
  await db
    .update(offers)
    .set({ lastVerifiedAt: new Date(), verifiedByUserId: session?.user?.id ?? null, updatedAt: new Date() })
    .where(eq(offers.id, id));
  revalidatePath('/admin/offers');
  revalidatePath(`/admin/offers/${id}/edit`);
}

/** Soft delete: offers are never hard-deleted; we move them to 'archived'. */
export async function softDeleteOffer(id: number): Promise<void> {
  await db.update(offers).set({ status: 'archived', updatedAt: new Date() }).where(eq(offers.id, id));
  revalidatePath('/admin/offers');
  redirect('/admin/offers');
}
