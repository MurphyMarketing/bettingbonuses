'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { regions, marketLegalStatusEnum } from '@/db/schema';
import { revalidatePublic } from '@/lib/revalidate-path';

export type StateFormState = { error?: string };

type MarketStatus = (typeof marketLegalStatusEnum.enumValues)[number];
const MARKET_STATUS_VALUES = marketLegalStatusEnum.enumValues as readonly string[];

export async function updateState(regionId: number, _prev: StateFormState, formData: FormData): Promise<StateFormState> {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  const url = str('regulatorUrl');
  if (url && !/^https?:\/\/.+/i.test(url)) {
    return { error: 'Regulator URL must be a full http(s) URL.' };
  }
  const legalRaw = str('legalSince');

  // Per-market status: only accept valid enum values; blank/invalid -> null.
  const marketStatus = (k: string): MarketStatus | null => {
    const v = str(k);
    return MARKET_STATUS_VALUES.includes(v) ? (v as MarketStatus) : null;
  };
  // Per-market min age: positive integer in a sane range, else null.
  const minAge = (k: string): number | null => {
    const v = str(k);
    if (!v) return null;
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) && n >= 18 && n <= 99 ? n : null;
  };

  try {
    await db
      .update(regions)
      .set({
        intro: str('intro') || null,
        regulator: str('regulator') || null,
        regulatorUrl: url || null,
        problemGamblingHotline: str('problemGamblingHotline') || null,
        bettingLegalDate: legalRaw ? new Date(legalRaw) : null,
        // Per-market columns (the deprecated betting_legal_status is no longer
        // edited here — left untouched to preserve its existing value).
        sportsbookStatus: marketStatus('sportsbookStatus'),
        predictionStatus: marketStatus('predictionStatus'),
        dfsStatus: marketStatus('dfsStatus'),
        racingStatus: marketStatus('racingStatus'),
        sportsbookMinAge: minAge('sportsbookMinAge'),
        predictionMinAge: minAge('predictionMinAge'),
        dfsMinAge: minAge('dfsMinAge'),
        racingMinAge: minAge('racingMinAge'),
        updatedAt: new Date(),
      })
      .where(eq(regions.id, regionId));
  } catch {
    return { error: 'Could not save. Please try again.' };
  }

  const [r] = await db.select({ slug: regions.slug }).from(regions).where(eq(regions.id, regionId)).limit(1);
  if (r) {
    revalidatePublic(`/states/${r.slug}`);
    revalidatePublic('/states');
  }
  revalidatePath('/admin/states');
  redirect('/admin/states');
}
