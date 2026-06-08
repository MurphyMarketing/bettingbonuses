'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { brandRegions, brands, regions } from '@/db/schema';

export type BrandStateFormState = { error?: string };

/** Update the brand × state (brand_regions) row. */
export async function updateBrandState(
  brandId: number,
  regionId: number,
  _prev: BrandStateFormState,
  formData: FormData,
): Promise<BrandStateFormState> {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  const launchedAtRaw = str('launchedAt');

  try {
    await db
      .update(brandRegions)
      .set({
        context: str('context') || null,
        headlineOverride: str('headlineOverride') || null,
        launchedAt: launchedAtRaw ? new Date(launchedAtRaw) : null,
        isActive: formData.get('isActive') != null,
        notes: str('notes') || null,
      })
      .where(and(eq(brandRegions.brandId, brandId), eq(brandRegions.regionId, regionId)));
  } catch {
    return { error: 'Could not save. Please try again.' };
  }

  const [b] = await db.select({ slug: brands.slug }).from(brands).where(eq(brands.id, brandId)).limit(1);
  const [r] = await db.select({ slug: regions.slug }).from(regions).where(eq(regions.id, regionId)).limit(1);
  if (b && r) revalidatePath(`/${b.slug}/${r.slug}/`);
  revalidatePath(`/admin/brands/${brandId}/states`);
  redirect(`/admin/brands/${brandId}/states`);
}
