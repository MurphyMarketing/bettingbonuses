import type { Metadata } from 'next';
import Link from 'next/link';
import { asc } from 'drizzle-orm';
import { db } from '@/db';
import { redirects } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { RedirectsTable } from './redirects-table';
import { BulkImport } from './bulk-import';

export const metadata: Metadata = { title: 'Redirects', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function RedirectsListPage() {
  const rows = await db.select().from(redirects).orderBy(asc(redirects.fromPath));

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Redirects</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total · checked in the proxy on every request</p>
        </div>
        <Button render={<Link href="/admin/redirects/new">New redirect</Link>} />
      </div>

      <RedirectsTable rows={rows} />

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-semibold">Bulk import</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Paste tab-separated <code>old_path&#9;new_path</code> pairs, one per line. Existing paths are skipped.
        </p>
        <BulkImport />
      </section>
    </main>
  );
}
