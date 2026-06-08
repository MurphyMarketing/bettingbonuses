import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { authors, brands, articles } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const metadata: Metadata = { title: 'Authors', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AuthorsListPage() {
  const rows = await db
    .select({
      id: authors.id,
      name: authors.name,
      slug: authors.slug,
      title: authors.title,
      isActive: authors.isActive,
      displayOrder: authors.displayOrder,
      brandCount: sql<number>`(select count(*)::int from ${brands} where ${brands.primaryAuthorId} = ${authors.id} or ${brands.secondaryAuthorId} = ${authors.id})`,
      articleCount: sql<number>`(select count(*)::int from ${articles} where ${articles.primaryAuthorId} = ${authors.id} or ${articles.secondaryAuthorId} = ${authors.id})`,
    })
    .from(authors)
    .orderBy(asc(authors.displayOrder), asc(authors.name));

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Authors</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total</p>
        </div>
        <Button render={<Link href="/admin/authors/new">New author</Link>} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Brands</TableHead>
              <TableHead className="text-right">Articles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/admin/authors/${a.id}/edit`} className="font-medium hover:underline">{a.name}</Link>
                  <span className="block text-xs text-muted-foreground">/authors/{a.slug}</span>
                </TableCell>
                <TableCell>{a.title ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <Badge variant={a.isActive ? 'default' : 'destructive'}>{a.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{a.brandCount}</TableCell>
                <TableCell className="text-right tabular-nums">{a.articleCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
