import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, sql } from 'drizzle-orm';
import { db } from '@/db';
import { regions, brandRegions, brands } from '@/db/schema';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const metadata: Metadata = { title: 'States', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

function YesNo({ value }: { value: boolean }) {
  return value ? <span className="font-medium text-primary">Yes</span> : <span className="text-muted-foreground">—</span>;
}

export default async function StatesAdminListPage() {
  const rows = await db
    .select({
      name: regions.name,
      slug: regions.slug,
      code: regions.code,
      intro: regions.intro,
      regulatorUrl: regions.regulatorUrl,
      hotline: regions.problemGamblingHotline,
      legalStatus: regions.bettingLegalStatus,
      brandCount: sql<number>`(select count(distinct ${brandRegions.brandId})::int from ${brandRegions} inner join ${brands} on ${brands.id} = ${brandRegions.brandId} where ${brandRegions.regionId} = ${regions.id} and ${brandRegions.isActive} = true and ${brands.status} = 'active')`,
    })
    .from(regions)
    .orderBy(asc(regions.name));

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold">States</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">{rows.length} states · per-state content completeness</p>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>State</TableHead>
              <TableHead>Intro</TableHead>
              <TableHead>Regulator URL</TableHead>
              <TableHead>Hotline</TableHead>
              <TableHead>Legal status</TableHead>
              <TableHead className="text-right">Brands</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.slug}>
                <TableCell>
                  <Link href={`/admin/states/${r.slug}`} className="font-medium hover:underline">{r.name}</Link>
                  <span className="ml-1 text-xs text-muted-foreground">({r.code})</span>
                </TableCell>
                <TableCell><YesNo value={Boolean(r.intro)} /></TableCell>
                <TableCell><YesNo value={Boolean(r.regulatorUrl)} /></TableCell>
                <TableCell><YesNo value={Boolean(r.hotline)} /></TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.legalStatus ?? '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{r.brandCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
