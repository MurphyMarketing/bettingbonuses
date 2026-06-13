'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { brandRegions, brands, regions } from '@/db/schema';
import { revalidatePublic } from '@/lib/revalidate-path';

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
  const launchYearRaw = str('launchYear');
  const launchYear = launchYearRaw ? Number(launchYearRaw) : null;
  const newRaw = str('isNewLaunch'); // '' = auto/null, 'true', 'false'
  const isNewLaunch = newRaw === 'true' ? true : newRaw === 'false' ? false : null;

  try {
    await db
      .update(brandRegions)
      .set({
        context: str('context') || null,
        headlineOverride: str('headlineOverride') || null,
        launchedAt: launchedAtRaw ? new Date(launchedAtRaw) : null,
        launchYear: launchYear != null && Number.isFinite(launchYear) ? launchYear : null,
        isNewLaunch,
        isActive: formData.get('isActive') != null,
        notes: str('notes') || null,
        updatedAt: new Date(),
      })
      .where(and(eq(brandRegions.brandId, brandId), eq(brandRegions.regionId, regionId)));
  } catch {
    return { error: 'Could not save. Please try again.' };
  }

  const [b] = await db.select({ slug: brands.slug }).from(brands).where(eq(brands.id, brandId)).limit(1);
  const [r] = await db.select({ slug: regions.slug }).from(regions).where(eq(regions.id, regionId)).limit(1);
  if (b && r) revalidatePublic(`/${b.slug}/${r.slug}`);
  revalidatePath(`/admin/brands/${brandId}/states`);
  redirect(`/admin/brands/${brandId}/states`);
}
