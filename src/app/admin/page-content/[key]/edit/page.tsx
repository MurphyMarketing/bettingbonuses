import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { pageContent } from '@/db/schema';
import { updatePageContent } from '../../actions';
import { PageContentForm } from '../../page-content-form';

export const metadata: Metadata = { title: 'Edit page content', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function EditPageContentPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const [row] = await db.select().from(pageContent).where(eq(pageContent.pageKey, key)).limit(1);
  if (!row) notFound();

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href="/admin/page-content" className="text-sm text-muted-foreground hover:underline">← Page content</Link>
        <h1 className="mt-1 text-2xl font-semibold">{row.label}</h1>
        <p className="text-sm text-muted-foreground">{row.pageKey}</p>
      </div>

      <PageContentForm
        action={updatePageContent.bind(null, row.pageKey)}
        pageKey={row.pageKey}
        introBody={row.introBody ?? ''}
        body={row.body ?? ''}
        submitLabel="Save changes"
      />
    </main>
  );
}
