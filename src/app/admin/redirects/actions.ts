'use server';

import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { redirects } from '@/db/schema';
import { invalidateRedirectsCache } from '@/lib/redirects-cache';
import { normalizeRedirectFromPath } from '@/lib/redirect-path';
import { redirectSchema, redirectFormToRaw, toFieldErrors, type RedirectFormState, type RedirectInput } from './schema';

function toColumns(data: RedirectInput) {
  return {
    fromPath: data.fromPath,
    toPath: data.toPath,
    statusCode: data.statusCode,
    isActive: data.isActive,
    notes: data.notes ?? null,
  };
}

async function fromPathTaken(fromPath: string, excludeId?: string) {
  const where = excludeId ? and(eq(redirects.fromPath, fromPath), ne(redirects.id, excludeId)) : eq(redirects.fromPath, fromPath);
  const [clash] = await db.select({ id: redirects.id }).from(redirects).where(where).limit(1);
  return Boolean(clash);
}

export async function createRedirect(_prev: RedirectFormState, formData: FormData): Promise<RedirectFormState> {
  const parsed = redirectSchema.safeParse(redirectFormToRaw(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  if (await fromPathTaken(parsed.data.fromPath)) return { errors: { fromPath: ['A redirect for that path already exists'] } };
  try {
    await db.insert(redirects).values(toColumns(parsed.data));
  } catch {
    return { errors: { _form: ['Could not save the redirect. Please try again.'] } };
  }
  invalidateRedirectsCache();
  revalidatePath('/admin/redirects');
  redirect('/admin/redirects');
}

export async function updateRedirect(id: string, _prev: RedirectFormState, formData: FormData): Promise<RedirectFormState> {
  const parsed = redirectSchema.safeParse(redirectFormToRaw(formData));
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  if (await fromPathTaken(parsed.data.fromPath, id)) return { errors: { fromPath: ['A redirect for that path already exists'] } };
  try {
    await db.update(redirects).set({ ...toColumns(parsed.data), updatedAt: new Date() }).where(eq(redirects.id, id));
  } catch {
    return { errors: { _form: ['Could not save the redirect. Please try again.'] } };
  }
  invalidateRedirectsCache();
  revalidatePath('/admin/redirects');
  redirect('/admin/redirects');
}

/** Soft delete: deactivate. */
export async function deactivateRedirect(id: string): Promise<void> {
  await db.update(redirects).set({ isActive: false, updatedAt: new Date() }).where(eq(redirects.id, id));
  invalidateRedirectsCache();
  revalidatePath('/admin/redirects');
  redirect('/admin/redirects');
}

export type BulkImportState = { error?: string; imported?: number; skipped?: number };

/** Paste tab-separated "old_path<TAB>new_path" pairs, one per line. */
export async function bulkImportRedirects(_prev: BulkImportState, formData: FormData): Promise<BulkImportState> {
  const raw = String(formData.get('pairs') ?? '');
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { error: 'Paste at least one tab-separated pair.' };

  let imported = 0;
  let skipped = 0;
  for (const line of lines) {
    const [from, to] = line.split('\t').map((s) => s.trim());
    if (!from || !to || !from.startsWith('/') || !(to.startsWith('/') || /^https?:\/\//i.test(to))) {
      skipped++;
      continue;
    }
    // Normalize to the slash-less form the proxy receives so cutover rows fire.
    const fromPath = normalizeRedirectFromPath(from);
    try {
      const res = await db.insert(redirects).values({ fromPath, toPath: to }).onConflictDoNothing().returning({ id: redirects.id });
      if (res.length) imported++;
      else skipped++; // already existed
    } catch {
      skipped++;
    }
  }

  invalidateRedirectsCache();
  revalidatePath('/admin/redirects');
  return { imported, skipped };
}
