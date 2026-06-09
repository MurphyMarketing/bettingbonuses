'use client';

import { Badge } from '@/components/ui/badge';
import { AdminTable, type AdminColumn, type AdminStatusFilter } from '@/components/admin/AdminTable';

export type SeriesRow = {
  id: number;
  name: string;
  slug: string;
  sportName: string | null;
  upcomingEventName: string | null;
  hasUpcoming: boolean;
  offerCount: number;
};

const columns: AdminColumn<SeriesRow>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    sortAccessor: (s) => s.name,
    cell: (s) => (
      <>
        <span className="font-medium">{s.name}</span>
        <span className="block text-xs text-muted-foreground">/{s.slug}</span>
      </>
    ),
  },
  { key: 'sport', label: 'Sport', sortable: true, sortAccessor: (s) => s.sportName, cell: (s) => s.sportName ?? <span className="text-muted-foreground">—</span> },
  {
    key: 'upcoming',
    label: 'Upcoming / current event',
    cell: (s) => (s.upcomingEventName ? <span className="flex items-center gap-2">{s.upcomingEventName}<Badge variant="secondary">soon</Badge></span> : <span className="text-muted-foreground">—</span>),
  },
  { key: 'offers', label: 'Active offers', sortable: true, sortAccessor: (s) => s.offerCount, cell: (s) => s.offerCount, className: 'text-right tabular-nums' },
];

const statusFilters: AdminStatusFilter<SeriesRow>[] = [
  { key: 'has-upcoming', label: 'Has upcoming event', predicate: (s) => s.hasUpcoming },
];

export function SeriesTable({ rows }: { rows: SeriesRow[] }) {
  return (
    <AdminTable
      rows={rows}
      columns={columns}
      searchFields={['name', 'slug']}
      statusFilters={statusFilters}
      rowHref={(s) => `/admin/event-series/${s.id}/edit`}
      defaultSort={{ key: 'name', direction: 'asc' }}
      searchPlaceholder="Search series…"
      emptyState="No event series match."
    />
  );
}
