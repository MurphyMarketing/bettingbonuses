'use client';

import { Badge } from '@/components/ui/badge';
import { AdminTable, type AdminColumn, type AdminStatusFilter } from '@/components/admin/AdminTable';
import type { EventTimeStatus } from '@/lib/event-time';

const STATUS_VARIANT: Record<EventTimeStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  current: 'default',
  upcoming: 'secondary',
  past: 'outline',
  evergreen: 'outline',
};
const STATUS_LABEL: Record<EventTimeStatus, string> = { current: 'Live', upcoming: 'Upcoming', past: 'Past', evergreen: 'Evergreen' };

export type EventRow = {
  id: number;
  name: string;
  slug: string;
  seriesName: string | null;
  startsAt: Date;
  endsAt: Date;
  startsLabel: string;
  endsLabel: string;
  status: EventTimeStatus;
  offerCount: number;
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
  { key: 'series', label: 'Series', sortable: true, sortAccessor: (e) => e.seriesName, cell: (e) => e.seriesName ?? <span className="text-muted-foreground">—</span> },
  { key: 'starts', label: 'Starts', sortable: true, sortAccessor: (e) => e.startsAt, cell: (e) => <span className="text-sm text-muted-foreground">{e.startsLabel}</span> },
  { key: 'ends', label: 'Ends', sortable: true, sortAccessor: (e) => e.endsAt, cell: (e) => <span className="text-sm text-muted-foreground">{e.endsLabel}</span> },
  { key: 'status', label: 'Status', cell: (e) => <Badge variant={STATUS_VARIANT[e.status]}>{STATUS_LABEL[e.status]}</Badge> },
  { key: 'offers', label: 'Offers', sortable: true, sortAccessor: (e) => e.offerCount, cell: (e) => e.offerCount, className: 'text-right tabular-nums' },
];

const statusFilters: AdminStatusFilter<EventRow>[] = [
  { key: 'upcoming', label: 'Upcoming', predicate: (e) => e.status === 'upcoming' },
  { key: 'current', label: 'Current', predicate: (e) => e.status === 'current' },
  { key: 'past', label: 'Past', predicate: (e) => e.status === 'past' },
];

export function EventsTable({ rows }: { rows: EventRow[] }) {
  return (
    <AdminTable
      rows={rows}
      columns={columns}
      searchFields={['name', 'slug']}
      statusFilters={statusFilters}
      rowHref={(e) => `/admin/events/${e.id}/edit`}
      defaultSort={{ key: 'starts', direction: 'desc' }}
      searchPlaceholder="Search events…"
      emptyState="No events match."
    />
  );
}
