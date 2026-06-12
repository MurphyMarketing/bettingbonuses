'use client';

import { Badge } from '@/components/ui/badge';
import { AdminTable, type AdminColumn, type AdminStatusFilter } from '@/components/admin/AdminTable';

const yes = (v: boolean) => (v ? <span className="font-medium text-primary">Yes</span> : <span className="text-muted-foreground">—</span>);

export type BrandStateRow = {
  stateName: string;
  stateSlug: string;
  isActive: boolean;
  context: string | null;
  headlineOverride: string | null;
  launchYear: number | null;
};

const columns: AdminColumn<BrandStateRow>[] = [
  { key: 'state', label: 'State', sortable: true, sortAccessor: (r) => r.stateName, cell: (r) => <span className="font-medium">{r.stateName}</span> },
  { key: 'context', label: 'Context', cell: (r) => yes(Boolean(r.context)) },
  { key: 'headline', label: 'Headline override', cell: (r) => yes(Boolean(r.headlineOverride)) },
  { key: 'launchYear', label: 'Launch year', sortable: true, sortAccessor: (r) => r.launchYear, cell: (r) => r.launchYear ?? '—', className: 'tabular-nums text-muted-foreground' },
  {
    key: 'active',
    label: 'Active',
    sortable: true,
    sortAccessor: (r) => r.isActive,
    cell: (r) => <Badge variant={r.isActive ? 'default' : 'destructive'}>{r.isActive ? 'Active' : 'Inactive'}</Badge>,
  },
];

const statusFilters: AdminStatusFilter<BrandStateRow>[] = [];

export function BrandStatesTable({ rows, brandId }: { rows: BrandStateRow[]; brandId: number }) {
  return (
    <AdminTable
      rows={rows}
      columns={columns}
      searchFields={['stateName']}
      statusFilters={statusFilters}
      rowHref={(r) => `/admin/brands/${brandId}/states/${r.stateSlug}`}
      defaultSort={{ key: 'state', direction: 'asc' }}
      searchPlaceholder="Search states…"
      emptyState="No states match."
    />
  );
}
