'use server';

import { eq, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { offers, brands, sports, eventSeries } from '@/db/schema';
import { BONUS_KIND_VALUES, ASSIGNABLE_BONUS_KIND_VALUES } from '../schema';

export type BulkState = { error?: string };

const DAY = 24 * 60 * 60 * 1000;
type BonusKind = (typeof BONUS_KIND_VALUES)[number];

export async function bulkCreateOffers(_prev: BulkState, fd: FormData): Promise<BulkState> {
  const targetType = String(fd.get('targetType') ?? '');
  const targetId = Number(fd.get('targetId'));
  const template = String(fd.get('headlineTemplate') ?? '').trim();
  const bonusKind = String(fd.get('bonusKind') ?? '');
  const validFromRaw = String(fd.get('validFrom') ?? '').trim();
  const validToRaw = String(fd.get('validTo') ?? '').trim();
  const brandIds = fd.getAll('brandIds').map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);

  if (!['series', 'sport'].includes(targetType)) return { error: 'Choose what to tie the offers to.' };
  if (!Number.isInteger(targetId) || targetId <= 0) return { error: 'Select a target.' };
  if (!brandIds.length) return { error: 'Select at least one brand.' };
  if (!template) return { error: 'Enter a headline template.' };
  if (!ASSIGNABLE_BONUS_KIND_VALUES.includes(bonusKind)) return { error: 'Choose a bonus type.' };

  // Validate the target exists; capture the event's occurrence end for valid-to.
  let eventEndsAt: Date | null = null;
  if (targetType === 'sport') {
    const [r] = await db.select({ id: sports.id }).from(sports).where(eq(sports.id, targetId)).limit(1);
    if (!r) return { error: 'That league/sport no longer exists.' };
  } else {
    const [r] = await db.select({ id: eventSeries.id, endsAt: eventSeries.endsAt }).from(eventSeries).where(eq(eventSeries.id, targetId)).limit(1);
    if (!r) return { error: 'That event no longer exists.' };
    eventEndsAt = r.endsAt;
  }

  const validFrom = validFromRaw ? new Date(validFromRaw) : new Date();
  const validTo = validToRaw
    ? new Date(validToRaw)
    : targetType === 'series' && eventEndsAt
      ? new Date(eventEndsAt.getTime() + DAY)
      : new Date(Date.now() + 30 * DAY);

  const brandRows = await db.select({ id: brands.id, name: brands.name }).from(brands).where(inArray(brands.id, brandIds));
  const nameById = new Map(brandRows.map((b) => [b.id, b.name]));

  // Exactly one target FK — satisfies offers_single_target by construction.
  const fk = targetType === 'sport' ? { sportId: targetId } : { seriesId: targetId };

  const rows = brandIds
    .filter((id) => nameById.has(id))
    .map((id) => ({
      brandId: id,
      bonusKind: bonusKind as BonusKind,
      userSegment: 'new' as const,
      status: 'draft' as const, // scaffold — not public until completed + published
      priority: 0,
      headline: template.replaceAll('{brand}', nameById.get(id)!),
      validFrom,
      validTo,
      ...fk,
    }));

  if (!rows.length) return { error: 'No valid brands selected.' };

  try {
    await db.transaction(async (tx) => {
      await tx.insert(offers).values(rows);
    });
  } catch {
    return { error: 'Could not create the offers. No partial batch was saved.' };
  }

  revalidatePath('/admin/offers');
  redirect('/admin/offers');
}
