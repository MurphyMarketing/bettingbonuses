import type { Metadata } from 'next';
import Link from 'next/link';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { brands, brandRegions, companies, offers } from '@/db/schema';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { categoryLabel, statusLabel, STATUS_BADGE_VARIANT } from './labels';

export const metadata: Metadata = { title: 'Brands', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function BrandsListPage() {
  const rows = await db
    .select({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
      category: brands.category,
      status: brands.status,
      companyName: companies.name,
      regionCount: sql<number>`(select count(*)::int from ${brandRegions} where ${brandRegions.brandId} = ${brands.id})`,
      offerCount: sql<number>`(select count(*)::int from ${offers} where ${offers.brandId} = ${brands.id})`,
    })
    .from(brands)
    .leftJoin(companies, eq(brands.companyId, companies.id))
    .orderBy(brands.name);

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Brands</h1>
          <p className="text-sm text-muted-foreground">{rows.length} total</p>
        </div>
        <Button render={<Link href="/admin/brands/new">New brand</Link>} />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Regions</TableHead>
              <TableHead className="text-right">Offers</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((b) => (
              <TableRow key={b.id}>
                <TableCell>
                  <Link href={`/admin/brands/${b.id}/edit`} className="font-medium hover:underline">
                    {b.name}
                  </Link>
                  <span className="block text-xs text-muted-foreground">/{b.slug}</span>
                </TableCell>
                <TableCell>{categoryLabel(b.category)}</TableCell>
                <TableCell>{b.companyName ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_BADGE_VARIANT[b.status] ?? 'secondary'}>
                    {statusLabel(b.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right tabular-nums">{b.regionCount}</TableCell>
                <TableCell className="text-right tabular-nums">{b.offerCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
