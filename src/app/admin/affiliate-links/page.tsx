import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { affiliateLinks, brands } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatRelativeTime } from '@/lib/datetime';

export const metadata: Metadata = { title: 'Affiliate links', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AffiliateLinksListPage() {
  const rows = await db
    .select({
      id: affiliateLinks.id,
      slug: affiliateLinks.slug,
      destinationUrl: affiliateLinks.destinationUrl,
      isActive: affiliateLinks.isActive,
      clickCount: affiliateLinks.clickCount,
      lastClickedAt: affiliateLinks.lastClickedAt,
      brandName: brands.name,
    })
    .from(affiliateLinks)
    .leftJoin(brands, eq(affiliateLinks.brandId, brands.id))
    .orderBy(asc(affiliateLinks.slug));

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Affiliate links</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total · resolve at /go/[slug]</p>
        </div>
        <Button render={<Link href="/admin/affiliate-links/new">New link</Link>} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Brand</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Destination</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Clicks</TableHead>
              <TableHead>Last clicked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.brandName ?? '—'}</TableCell>
                <TableCell>
                  <Link href={`/admin/affiliate-links/${l.id}/edit`} className="font-mono text-sm font-medium hover:underline">/go/{l.slug}</Link>
                </TableCell>
                <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{l.destinationUrl}</TableCell>
                <TableCell><Badge variant={l.isActive ? 'default' : 'destructive'}>{l.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
                <TableCell className="text-right tabular-nums">{l.clickCount}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{l.lastClickedAt ? formatRelativeTime(l.lastClickedAt) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
