'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { regions } from '@/db/schema';
import { revalidatePublic } from '@/lib/revalidate-path';

export type StateFormState = { error?: string };

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

  try {
    await db
      .update(regions)
      .set({
        intro: str('intro') || null,
        regulator: str('regulator') || null,
        regulatorUrl: url || null,
        problemGamblingHotline: str('problemGamblingHotline') || null,
        bettingLegalStatus: str('bettingLegalStatus') || null,
        bettingLegalDate: legalRaw ? new Date(legalRaw) : null,
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
