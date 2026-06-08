import type { Metadata } from 'next';
import Link from 'next/link';
import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';
import { db } from '@/db';
import { brands, offers } from '@/db/schema';
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
import { formatUsdCents } from '@/lib/money';
import { isStale, formatRelativeTime } from '@/lib/datetime';
import { bonusKindLabel, offerStatusLabel, OFFER_STATUS_BADGE_VARIANT, OFFER_STATUS_LABELS } from './labels';
import { OFFER_STATUS_VALUES } from './schema';

type OfferStatus = (typeof OFFER_STATUS_VALUES)[number];

export const metadata: Metadata = { title: 'Offers', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const VALID_WINDOWS: Record<string, string> = {
  any: 'Any window',
  current: 'Currently valid',
  upcoming: 'Upcoming',
  expired: 'Expired',
  evergreen: 'Evergreen',
};

const SORT_COLUMNS = {
  headline: offers.headline,
  brand: brands.name,
  status: offers.status,
  valid_to: offers.validTo,
  verified: offers.lastVerifiedAt,
  priority: offers.priority,
} as const;
type SortKey = keyof typeof SORT_COLUMNS;

type SearchParams = Record<string, string | string[] | undefined>;

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

export default async function OffersListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const brandFilter = first(sp.brand);
  const statusFilter = first(sp.status);
  const validFilter = first(sp.valid) || 'any';
  const sort = (first(sp.sort) || 'priority') as SortKey;
  const dir = first(sp.dir) === 'asc' ? 'asc' : 'desc';

  const conditions: SQL[] = [];
  if (brandFilter && Number.isInteger(Number(brandFilter))) {
    conditions.push(eq(offers.brandId, Number(brandFilter)));
  }
  if ((OFFER_STATUS_VALUES as readonly string[]).includes(statusFilter)) {
    conditions.push(eq(offers.status, statusFilter as OfferStatus));
  }
  if (validFilter === 'current') {
    conditions.push(sql`(${offers.validFrom} is null or ${offers.validFrom} <= now()) and (${offers.validTo} is null or ${offers.validTo} >= now())`);
  } else if (validFilter === 'upcoming') {
    conditions.push(sql`${offers.validFrom} > now()`);
  } else if (validFilter === 'expired') {
    conditions.push(sql`${offers.validTo} < now()`);
  } else if (validFilter === 'evergreen') {
    conditions.push(sql`${offers.validFrom} is null and ${offers.validTo} is null`);
  }

  const sortCol = SORT_COLUMNS[sort] ?? offers.priority;
  const orderBy = dir === 'asc' ? asc(sortCol) : desc(sortCol);

  const [rows, brandRows] = await Promise.all([
    db
      .select({
        id: offers.id,
        headline: offers.headline,
        bonusKind: offers.bonusKind,
        status: offers.status,
        priority: offers.priority,
        validFrom: offers.validFrom,
        validTo: offers.validTo,
        lastVerifiedAt: offers.lastVerifiedAt,
        bonusAmountCents: offers.bonusAmountCents,
        brandName: brands.name,
      })
      .from(offers)
      .leftJoin(brands, eq(offers.brandId, brands.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(orderBy),
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(brands.name),
  ]);

  // Build a sort link that preserves the current filters and toggles direction.
  const sortHref = (key: SortKey) => {
    const params = new URLSearchParams();
    if (brandFilter) params.set('brand', brandFilter);
    if (statusFilter) params.set('status', statusFilter);
    if (validFilter !== 'any') params.set('valid', validFilter);
    params.set('sort', key);
    params.set('dir', sort === key && dir === 'asc' ? 'desc' : 'asc');
    return `/admin/offers?${params.toString()}`;
  };
  const SortHead = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => (
    <TableHead className={className}>
      <Link href={sortHref(k)} className="inline-flex items-center gap-1 hover:underline">
        {label}
        {sort === k ? <span className="text-muted-foreground">{dir === 'asc' ? '↑' : '↓'}</span> : null}
      </Link>
    </TableHead>
  );

  const fmtDate = (d: Date | null) => (d ? d.toLocaleDateString('en-US') : '—');

  return (
    <main className="mx-auto max-w-7xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Offers</h1>
          <p className="text-sm text-muted-foreground">{rows.length} shown</p>
        </div>
        <Button render={<Link href="/admin/offers/new">New offer</Link>} />
      </div>

      {/* Filter bar (GET form, native selects) */}
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Brand</span>
          <select name="brand" defaultValue={brandFilter} className="h-8 rounded-lg border bg-transparent px-2 text-sm">
            <option value="">All brands</option>
            {brandRows.map((b) => (
              <option key={b.id} value={String(b.id)}>{b.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Status</span>
          <select name="status" defaultValue={statusFilter} className="h-8 rounded-lg border bg-transparent px-2 text-sm">
            <option value="">All statuses</option>
            {Object.entries(OFFER_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Valid window</span>
          <select name="valid" defaultValue={validFilter} className="h-8 rounded-lg border bg-transparent px-2 text-sm">
            {Object.entries(VALID_WINDOWS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        {/* preserve current sort across filtering */}
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <Button type="submit" variant="outline">Filter</Button>
        <Link href="/admin/offers" className="text-sm text-muted-foreground hover:underline">Clear</Link>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead k="headline" label="Headline" />
              <SortHead k="brand" label="Brand" />
              <TableHead>Type</TableHead>
              <SortHead k="status" label="Status" />
              <SortHead k="valid_to" label="Valid" />
              <SortHead k="verified" label="Verified" />
              <SortHead k="priority" label="Priority" className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No offers match these filters.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/admin/offers/${o.id}/edit`} className="font-medium hover:underline">
                      {o.headline}
                    </Link>
                    {o.bonusAmountCents != null ? (
                      <span className="block text-xs text-muted-foreground">{formatUsdCents(o.bonusAmountCents)}</span>
                    ) : null}
                  </TableCell>
                  <TableCell>{o.brandName ?? '—'}</TableCell>
                  <TableCell>{bonusKindLabel(o.bonusKind)}</TableCell>
                  <TableCell>
                    <Badge variant={OFFER_STATUS_BADGE_VARIANT[o.status] ?? 'secondary'}>
                      {offerStatusLabel(o.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {fmtDate(o.validFrom)} → {fmtDate(o.validTo)}
                  </TableCell>
                  <TableCell>
                    {isStale(o.lastVerifiedAt) ? (
                      <Badge variant="destructive">Stale</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        verified {formatRelativeTime(o.lastVerifiedAt!)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{o.priority}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
