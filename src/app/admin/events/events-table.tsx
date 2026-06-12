'use client';

import { Badge } from '@/components/ui/badge';
import { AdminTable, type AdminColumn, type AdminStatusFilter } from '@/components/admin/AdminTable';
import { EVENT_STATUS_LABEL, type EventTimeStatus } from '@/lib/event-time';

export type EventRow = {
  id: number;
  name: string;
  slug: string;
  sportName: string | null;
  status: EventTimeStatus;
  whenLabel: string;
  offerCount: number;
};

const STATUS_VARIANT: Record<EventTimeStatus, 'default' | 'secondary' | 'outline'> = {
  current: 'default',
  upcoming: 'secondary',
  past: 'outline',
  evergreen: 'outline',
};

const columns: AdminColumn<EventRow>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    sortAccessor: (e) => e.name,
    cell: (e) => (
      <>
        <span className="font-medium">{e.name}</span>
        <span className="block text-xs text-muted-foreground">/{e.slug}</span>
      </>
    ),
  },
  { key: 'sport', label: 'League / sport', sortable: true, sortAccessor: (e) => e.sportName, cell: (e) => e.sportName ?? <span className="text-muted-foreground">—</span> },
  {
    key: 'when',
    label: 'Current occurrence',
    cell: (e) => (
      <span className="flex items-center gap-2">
        <Badge variant={STATUS_VARIANT[e.status]}>{EVENT_STATUS_LABEL[e.status]}</Badge>
        <span className="text-sm text-muted-foreground">{e.whenLabel}</span>
      </span>
    ),
  },
  { key: 'offers', label: 'Active offers', sortable: true, sortAccessor: (e) => e.offerCount, cell: (e) => e.offerCount, className: 'text-right tabular-nums' },
];

const statusFilters: AdminStatusFilter<EventRow>[] = [
  { key: 'live-upcoming', label: 'Live or upcoming', predicate: (e) => e.status === 'current' || e.status === 'upcoming' },
];

export function EventsTable({ rows }: { rows: EventRow[] }) {
  return (
    <AdminTable
      rows={rows}
      columns={columns}
      searchFields={['name', 'slug']}
      statusFilters={statusFilters}
      rowHref={(e) => `/admin/events/${e.id}/edit`}
      defaultSort={{ key: 'name', direction: 'asc' }}
      searchPlaceholder="Search events…"
      emptyState="No events match."
    />
  );
}
