'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db';
import { pageContent } from '@/db/schema';

export type PageContentFormState = { error?: string };

// page_key -> the public route whose content it drives (for revalidation after edit).
const PUBLIC_PATH: Record<string, string> = {
  sportsbooks: '/sportsbooks',
  'prediction-markets': '/prediction-markets',
  'horse-racing': '/horse-racing',
  dfs: '/dfs',
  'states-index': '/states',
  'sports-index': '/sports',
};

export async function updatePageContent(
  pageKey: string,
  _prev: PageContentFormState,
  fd: FormData,
): Promise<PageContentFormState> {
  const session = await auth();
  if (!session) return { error: 'Unauthorized' };

  const str = (k: string) => {
    const v = fd.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };
  const introBody = str('introBody') || null;
  const body = str('body') || null;

  const updated = await db
    .update(pageContent)
    .set({ introBody, body, updatedAt: new Date() })
    .where(eq(pageContent.pageKey, pageKey))
    .returning({ pageKey: pageContent.pageKey });
  if (!updated.length) return { error: 'That page no longer exists.' };

  revalidatePath('/admin/page-content');
  const publicPath = PUBLIC_PATH[pageKey];
  if (publicPath) revalidatePath(publicPath);
  redirect('/admin/page-content');
}
