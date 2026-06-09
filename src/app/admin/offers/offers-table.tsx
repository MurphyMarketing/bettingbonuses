'use client';

import { Badge } from '@/components/ui/badge';
import { AdminTable, type AdminColumn, type AdminStatusFilter } from '@/components/admin/AdminTable';
import { formatUsdCents } from '@/lib/money';
import { bonusKindLabel, offerStatusLabel, OFFER_STATUS_BADGE_VARIANT } from './labels';

const DAY = 86_400_000;

export type OfferRow = {
  id: number;
  headline: string;
  brandName: string | null;
  bonusKind: string;
  status: string;
  priority: number;
  bonusAmountCents: number | null;
  validTo: Date | null;
  lastVerifiedAt: Date | null;
  // server-precomputed display strings (avoid client date/locale hydration drift)
  validLabel: string;
  verifiedRelative: string | null;
  staleBadge: boolean;
};

const columns: AdminColumn<OfferRow>[] = [
  {
    key: 'headline',
    label: 'Headline',
    sortable: true,
    sortAccessor: (o) => o.headline,
    cell: (o) => (
      <>
        <span className="font-medium">{o.headline}</span>
        {o.bonusAmountCents != null ? <span className="block text-xs text-muted-foreground">{formatUsdCents(o.bonusAmountCents)}</span> : null}
      </>
    ),
  },
  { key: 'brand', label: 'Brand', sortable: true, sortAccessor: (o) => o.brandName, cell: (o) => o.brandName ?? '—' },
  { key: 'type', label: 'Type', cell: (o) => bonusKindLabel(o.bonusKind) },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    sortAccessor: (o) => o.status,
    cell: (o) => <Badge variant={OFFER_STATUS_BADGE_VARIANT[o.status] ?? 'secondary'}>{offerStatusLabel(o.status)}</Badge>,
  },
  { key: 'valid', label: 'Valid', sortable: true, sortAccessor: (o) => o.validTo, cell: (o) => <span className="text-sm text-muted-foreground">{o.validLabel}</span> },
  {
    key: 'verified',
    label: 'Verified',
    sortable: true,
    sortAccessor: (o) => o.lastVerifiedAt,
    cell: (o) =>
      o.staleBadge ? <Badge variant="destructive">Stale</Badge> : <span className="text-sm text-muted-foreground">verified {o.verifiedRelative}</span>,
  },
  { key: 'priority', label: 'Priority', sortable: true, sortAccessor: (o) => o.priority, cell: (o) => o.priority, className: 'text-right tabular-nums' },
];

const statusFilters: AdminStatusFilter<OfferRow>[] = [
  { key: 'active', label: 'Active', predicate: (o) => o.status === 'active' },
  { key: 'expired', label: 'Expired', predicate: (o) => o.validTo != null && o.validTo.getTime() < Date.now() },
  { key: 'stale', label: 'Stale (30d+)', predicate: (o) => !o.lastVerifiedAt || Date.now() - o.lastVerifiedAt.getTime() > 30 * DAY },
];

export function OffersTable({ rows }: { rows: OfferRow[] }) {
  return (
    <AdminTable
      rows={rows}
      columns={columns}
      searchFields={['headline', (o) => o.brandName ?? '']}
      statusFilters={statusFilters}
      rowHref={(o) => `/admin/offers/${o.id}/edit`}
      defaultSort={{ key: 'verified', direction: 'desc' }}
      searchPlaceholder="Search offers…"
      emptyState="No offers match."
    />
  );
}
