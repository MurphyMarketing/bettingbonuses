'use server';

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { brands, companies, authors } from '@/db/schema';
import { isValidSlug, slugify } from '@/lib/slug';
import { slugTaken } from '@/lib/slug-check';
import {
  brandSchema,
  brandFormToRaw,
  toFieldErrors,
  type BrandFormState,
  type BrandInput,
} from './schema';

/** Shared field -> column mapping for insert/update. */
function toColumns(data: BrandInput, slug: string) {
  return {
    name: data.name,
    slug,
    category: data.category,
    status: data.status,
    companyId: data.companyId ?? null,
    rebrandedFromId: data.rebrandedFromId ?? null,
    countryCode: data.countryCode,
    websiteUrl: data.websiteUrl ?? null,
    appStoreUrl: data.appStoreUrl ?? null,
    playStoreUrl: data.playStoreUrl ?? null,
    affiliateProgram: data.affiliateProgram ?? null,
    defaultAffiliateLink: data.defaultAffiliateLink ?? null,
    shortDescription: data.shortDescription ?? null,
    fullDescription: data.fullDescription ?? null,
    yearFounded: data.yearFounded ?? null,
    launchDate: data.launchDate ?? null,
    sunsetDate: data.sunsetDate ?? null,
    notes: data.notes ?? null,
    introParagraph: data.introParagraph ?? null,
    howToClaimSteps: data.howToClaimSteps ?? null,
    pros: data.pros ?? null,
    cons: data.cons ?? null,
    verdict: data.verdict ?? null,
    otherPromotions: data.otherPromotions ?? null,
    depositOptions: data.depositOptions ?? null,
    primaryAuthorId: data.primaryAuthorId ?? null,
    secondaryAuthorId: data.secondaryAuthorId ?? null,
  };
}

/** Validate referenced company/rebranded-from rows. `selfId` is the brand being
 *  edited (so it can't be its own predecessor); undefined on create. */
async function checkReferences(
  data: BrandInput,
  selfId?: number,
): Promise<Record<string, string[]> | null> {
  const errors: Record<string, string[]> = {};

  if (data.companyId != null) {
    const [c] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.id, data.companyId))
      .limit(1);
    if (!c) errors.companyId = ['Selected company no longer exists'];
  }

  if (data.rebrandedFromId != null) {
    if (selfId != null && data.rebrandedFromId === selfId) {
      errors.rebrandedFromId = ['A brand cannot be rebranded from itself'];
    } else {
      const [b] = await db
        .select({ id: brands.id, status: brands.status })
        .from(brands)
        .where(eq(brands.id, data.rebrandedFromId))
        .limit(1);
      if (!b) errors.rebrandedFromId = ['Selected brand no longer exists'];
      else if (b.status === 'planned') {
        errors.rebrandedFromId = ['Cannot rebrand from a planned brand'];
      }
    }
  }

  for (const key of ['primaryAuthorId', 'secondaryAuthorId'] as const) {
    const id = data[key];
    if (id) {
      const [a] = await db.select({ id: authors.id }).from(authors).where(eq(authors.id, id)).limit(1);
      if (!a) errors[key] = ['Selected author no longer exists'];
    }
  }
  if (data.primaryAuthorId && data.primaryAuthorId === data.secondaryAuthorId) {
    errors.secondaryAuthorId = ['Secondary author must differ from primary'];
  }

  return Object.keys(errors).length ? errors : null;
}

/** Resolve the final slug (explicit or derived) and check uniqueness.
 *  Returns the slug, or field errors. `excludeId` skips the row being edited. */
async function resolveSlug(
  data: BrandInput,
  excludeId?: number,
): Promise<{ slug: string } | { errors: Record<string, string[]> }> {
  const slug = data.slug ?? slugify(data.name);
  if (!slug || !isValidSlug(slug)) {
    return { errors: { slug: ['Could not derive a valid slug from the name — enter one manually'] } };
  }
  // Slug must be unique across brands AND articles (shared root URL namespace).
  if (await slugTaken(slug, { exceptBrandId: excludeId })) {
    return { errors: { slug: ['That slug is already used by another brand or an article'] } };
  }
  return { slug };
}

export async function createBrand(
  _prev: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const parsed = brandSchema.safeParse(brandFormToRaw(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const data = parsed.data;

  const slugResult = await resolveSlug(data);
  if ('errors' in slugResult) return slugResult;

  const refErrors = await checkReferences(data);
  if (refErrors) return { errors: refErrors };

  try {
    await db.insert(brands).values(toColumns(data, slugResult.slug));
  } catch {
    return { errors: { _form: ['Could not save the brand. Please try again.'] } };
  }

  revalidatePath('/admin/brands');
  redirect('/admin/brands');
}

export async function updateBrand(
  id: number,
  _prev: BrandFormState,
  formData: FormData,
): Promise<BrandFormState> {
  const parsed = brandSchema.safeParse(brandFormToRaw(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  const data = parsed.data;

  const slugResult = await resolveSlug(data, id);
  if ('errors' in slugResult) return slugResult;

  const refErrors = await checkReferences(data, id);
  if (refErrors) return { errors: refErrors };

  try {
    await db
      .update(brands)
      .set({ ...toColumns(data, slugResult.slug), updatedAt: new Date() })
      .where(eq(brands.id, id));
  } catch {
    return { errors: { _form: ['Could not save the brand. Please try again.'] } };
  }

  revalidatePath('/admin/brands');
  revalidatePath(`/admin/brands/${id}/edit`);
  redirect('/admin/brands');
}

/** Soft delete: brands are never hard-deleted; we move them to 'sunset'. */
export async function softDeleteBrand(id: number): Promise<void> {
  await db
    .update(brands)
    .set({ status: 'sunset', updatedAt: new Date() })
    .where(eq(brands.id, id));
  revalidatePath('/admin/brands');
  redirect('/admin/brands');
}

/* ------------------------------------------------------------------ *
 * Logo upload
 * ------------------------------------------------------------------ */
export type LogoUploadState = { error?: string; ok?: boolean };

const LOGO_MAX_BYTES = 500 * 1024; // 500KB
const LOGO_MIME_EXT: Record<string, string> = {
  'image/svg+xml': 'svg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Save uploaded logo file(s) to /public/logos and point the brand at them.
 * Files are named by brand slug so they overwrite on re-upload. Writes to the
 * repo's public/ dir — fine in local/dev (then commit the asset); note that a
 * read-only/ephemeral host filesystem won't persist runtime uploads.
 */
export async function uploadBrandLogo(
  id: number,
  _prev: LogoUploadState,
  formData: FormData,
): Promise<LogoUploadState> {
  const [brand] = await db.select({ slug: brands.slug }).from(brands).where(eq(brands.id, id)).limit(1);
  if (!brand) return { error: 'Brand not found.' };

  const fields: { input: string; column: 'logoUrl' | 'logoSquareUrl'; suffix: string }[] = [
    { input: 'logo', column: 'logoUrl', suffix: '' },
    { input: 'logoSquare', column: 'logoSquareUrl', suffix: '-square' },
  ];

  const updates: Partial<Record<'logoUrl' | 'logoSquareUrl', string>> = {};
  const dir = path.join(process.cwd(), 'public', 'logos');

  for (const { input, column, suffix } of fields) {
    const file = formData.get(input);
    if (!(file instanceof File) || file.size === 0) continue; // nothing uploaded for this slot

    if (file.size > LOGO_MAX_BYTES) {
      return { error: `${input === 'logo' ? 'Logo' : 'Square logo'} is larger than 500KB.` };
    }
    const ext = LOGO_MIME_EXT[file.type];
    if (!ext) {
      return { error: `${input === 'logo' ? 'Logo' : 'Square logo'} must be SVG, PNG, or WebP.` };
    }

    const filename = `${brand.slug}${suffix}.${ext}`;
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    updates[column] = `/logos/${filename}`;
  }

  if (Object.keys(updates).length === 0) {
    return { error: 'Choose a file to upload first.' };
  }

  await db.update(brands).set({ ...updates, updatedAt: new Date() }).where(eq(brands.id, id));
  revalidatePath(`/admin/brands/${id}/edit`);
  revalidatePath(`/${brand.slug}/`); // public brand page (ISR)
  return { ok: true };
}
