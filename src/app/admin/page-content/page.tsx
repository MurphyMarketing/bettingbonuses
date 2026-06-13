import type { Metadata } from 'next';
import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { pageContent } from '@/db/schema';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Page content', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function PageContentListPage() {
  const rows = await db
    .select({ pageKey: pageContent.pageKey, label: pageContent.label, introBody: pageContent.introBody, body: pageContent.body })
    .from(pageContent)
    .orderBy(asc(pageContent.label));

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Page content</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} hub/index pages · rich content above and below each page&rsquo;s primary content
        </p>
      </div>

      <ul className="flex flex-col divide-y rounded-md border">
        {rows.map((r) => (
          <li key={r.pageKey}>
            <Link href={`/admin/page-content/${r.pageKey}/edit`} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 p-3 hover:bg-muted">
              <span className="min-w-0 flex-1 basis-64">
                <span className="block font-medium">{r.label}</span>
                <span className="block text-xs text-muted-foreground">{r.pageKey}</span>
              </span>
              <span className="flex items-center gap-1.5">
                {r.introBody ? <Badge variant="secondary">Intro</Badge> : null}
                {r.body ? <Badge variant="secondary">Body</Badge> : null}
                {!r.introBody && !r.body ? <span className="text-xs text-muted-foreground">Empty</span> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
