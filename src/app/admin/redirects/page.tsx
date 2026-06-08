import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { redirects } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BulkImport } from './bulk-import';

export const metadata: Metadata = { title: 'Redirects', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RedirectsListPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filter = Array.isArray(sp.active) ? sp.active[0] : sp.active; // 'active' | 'inactive' | undefined

  const rows = await db
    .select()
    .from(redirects)
    .where(filter === 'active' ? eq(redirects.isActive, true) : filter === 'inactive' ? eq(redirects.isActive, false) : undefined)
    .orderBy(asc(redirects.fromPath));

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Redirects</h1>
          <p className="text-sm text-muted-foreground">{rows.length} shown · checked in the proxy on every request</p>
        </div>
        <Button render={<Link href="/admin/redirects/new">New redirect</Link>} />
      </div>

      <div className="mb-4 flex items-center gap-3 text-sm">
        <span className="text-muted-foreground">Filter:</span>
        <Link href="/admin/redirects" className={!filter ? 'font-medium' : 'text-muted-foreground hover:underline'}>All</Link>
        <Link href="/admin/redirects?active=active" className={filter === 'active' ? 'font-medium' : 'text-muted-foreground hover:underline'}>Active</Link>
        <Link href="/admin/redirects?active=inactive" className={filter === 'inactive' ? 'font-medium' : 'text-muted-foreground hover:underline'}>Inactive</Link>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No redirects.</TableCell></TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/admin/redirects/${r.id}/edit`} className="font-mono text-sm font-medium hover:underline">{r.fromPath}</Link>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{r.toPath}</TableCell>
                  <TableCell className="tabular-nums">{r.statusCode}</TableCell>
                  <TableCell><Badge variant={r.isActive ? 'default' : 'destructive'}>{r.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

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
