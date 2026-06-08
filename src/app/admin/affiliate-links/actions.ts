'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { affiliateLinks, brands, offers } from '@/db/schema';
import {
  affiliateLinkSchema,
  affiliateLinkFormToRaw,
  toFieldErrors,
  type AffiliateLinkFormState,
  type AffiliateLinkInput,
} from './schema';

function toColumns(data: AffiliateLinkInput) {
  return {
    slug: data.slug,
    brandId: data.brandId,
    offerId: data.offerId ?? null,
    destinationUrl: data.destinationUrl,
    label: data.label ?? null,
    network: data.network ?? null,
    isActive: data.isActive,
    validFrom: data.validFrom ?? null,
    validTo: data.validTo ?? null,
  };
}

async function checkRefs(data: AffiliateLinkInput, excludeId?: number): Promise<Record<string, string[]> | null> {
  const errors: Record<string, string[]> = {};
  const where = excludeId ? and(eq(affiliateLinks.slug, data.slug), ne(affiliateLinks.id, excludeId)) : eq(affiliateLinks.slug, data.slug);
  const [clash] = await db.select({ id: affiliateLinks.id }).from(affiliateLinks).where(where).limit(1);
  if (clash) errors.slug = ['That slug is already in use'];
  const [b] = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, data.brandId)).limit(1);
  if (!b) errors.brandId = ['Selected brand no longer exists'];
  if (data.offerId != null) {
    const [o] = await db.select({ id: offers.id }).from(offers).where(eq(offers.id, data.offerId)).limit(1);
    if (!o) errors.offerId = ['Selected offer no longer exists'];
  }
  return Object.keys(errors).length ? errors : null;
}

export async function createAffiliateLink(_prev: AffiliateLinkFormState, formData: FormData): Promise<AffiliateLinkFormState> {
  const parsed = affiliateLinkSchema.safeParse(affiliateLinkFormToRaw(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const refErrors = await checkRefs(parsed.data);
  if (refErrors) return { errors: refErrors };
  try {
    await db.insert(affiliateLinks).values(toColumns(parsed.data));
  } catch {
    return { errors: { _form: ['Could not save the link. Please try again.'] } };
  }
  revalidatePath('/admin/affiliate-links');
  redirect('/admin/affiliate-links');
}

export async function updateAffiliateLink(id: number, _prev: AffiliateLinkFormState, formData: FormData): Promise<AffiliateLinkFormState> {
  const parsed = affiliateLinkSchema.safeParse(affiliateLinkFormToRaw(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const refErrors = await checkRefs(parsed.data, id);
  if (refErrors) return { errors: refErrors };
  try {
    await db.update(affiliateLinks).set({ ...toColumns(parsed.data), updatedAt: new Date() }).where(eq(affiliateLinks.id, id));
  } catch {
    return { errors: { _form: ['Could not save the link. Please try again.'] } };
  }
  revalidatePath('/admin/affiliate-links');
  redirect('/admin/affiliate-links');
}

/** Soft delete: deactivate. */
export async function deactivateAffiliateLink(id: number): Promise<void> {
  await db.update(affiliateLinks).set({ isActive: false, updatedAt: new Date() }).where(eq(affiliateLinks.id, id));
  revalidatePath('/admin/affiliate-links');
  redirect('/admin/affiliate-links');
}
