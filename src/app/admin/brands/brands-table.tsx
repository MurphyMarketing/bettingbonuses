'use client';

import { Badge } from '@/components/ui/badge';
import { AdminTable, type AdminColumn, type AdminStatusFilter } from '@/components/admin/AdminTable';
import { categoryLabel, statusLabel, STATUS_BADGE_VARIANT } from './labels';

export type BrandRow = {
  id: number;
  name: string;
  slug: string;
  category: string;
  status: string;
  companyName: string | null;
  regionCount: number;
  offerCount: number;
  logoUrl: string | null;
  introParagraph: string | null;
  newLaunchMissingContext: boolean;
};

const columns: AdminColumn<BrandRow>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    sortAccessor: (b) => b.name,
    cell: (b) => (
      <>
        <span className="font-medium">{b.name}</span>
        <span className="block text-xs text-muted-foreground">/{b.slug}</span>
      </>
    ),
  },
  { key: 'category', label: 'Category', sortable: true, sortAccessor: (b) => categoryLabel(b.category), cell: (b) => categoryLabel(b.category) },
  { key: 'company', label: 'Company', sortable: true, sortAccessor: (b) => b.companyName, cell: (b) => b.companyName ?? <span className="text-muted-foreground">—</span> },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    sortAccessor: (b) => b.status,
    cell: (b) => <Badge variant={STATUS_BADGE_VARIANT[b.status] ?? 'secondary'}>{statusLabel(b.status)}</Badge>,
  },
  { key: 'regions', label: 'Regions', sortable: true, sortAccessor: (b) => b.regionCount, cell: (b) => b.regionCount, className: 'text-right tabular-nums' },
  { key: 'offers', label: 'Offers', sortable: true, sortAccessor: (b) => b.offerCount, cell: (b) => b.offerCount, className: 'text-right tabular-nums' },
];

const statusFilters: AdminStatusFilter<BrandRow>[] = [
  { key: 'active', label: 'Active', predicate: (b) => b.status === 'active' },
  { key: 'inactive', label: 'Inactive', predicate: (b) => b.status !== 'active' },
  { key: 'no-logo', label: 'No logo', predicate: (b) => !b.logoUrl },
  { key: 'no-intro', label: 'No intro', predicate: (b) => !b.introParagraph },
  { key: 'new-launch-missing-context', label: 'New launch · no context', predicate: (b) => b.newLaunchMissingContext },
];

export function BrandsTable({ rows }: { rows: BrandRow[] }) {
  return (
    <AdminTable
      rows={rows}
      columns={columns}
      searchFields={['name', 'slug']}
      statusFilters={statusFilters}
      rowHref={(b) => `/admin/brands/${b.id}/edit`}
      defaultSort={{ key: 'name', direction: 'asc' }}
      searchPlaceholder="Search brands…"
      emptyState="No brands match."
    />
  );
}
