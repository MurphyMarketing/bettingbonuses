import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { brands, brandRegions, regions } from '@/db/schema';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export const metadata: Metadata = { title: 'Brand states', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function BrandStatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [brand] = await db.select({ id: brands.id, name: brands.name }).from(brands).where(eq(brands.id, id)).limit(1);
  if (!brand) notFound();

  const rows = await db
    .select({
      stateName: regions.name,
      stateSlug: regions.slug,
      isActive: brandRegions.isActive,
      context: brandRegions.context,
      headlineOverride: brandRegions.headlineOverride,
    })
    .from(brandRegions)
    .innerJoin(regions, eq(brandRegions.regionId, regions.id))
    .where(eq(brandRegions.brandId, id))
    .orderBy(regions.name);

  return (
    <main className="mx-auto max-w-4xl p-8">
      <div className="mb-6">
        <Link href={`/admin/brands/${id}/edit`} className="text-sm text-muted-foreground hover:underline">← {brand.name}</Link>
        <h1 className="mt-1 text-2xl font-semibold">{brand.name} — States</h1>
        <p className="text-sm text-muted-foreground">{rows.length} states · per-state copy and headline overrides</p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>State</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Headline override</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.stateSlug}>
                <TableCell>
                  <Link href={`/admin/brands/${id}/states/${r.stateSlug}`} className="font-medium hover:underline">{r.stateName}</Link>
                </TableCell>
                <TableCell>{r.context ? <span className="text-primary">Yes</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell>{r.headlineOverride ? <span className="text-primary">Yes</span> : <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell><Badge variant={r.isActive ? 'default' : 'destructive'}>{r.isActive ? 'Active' : 'Inactive'}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
