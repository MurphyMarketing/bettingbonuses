'use client';

import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable';

export type SportRow = {
  id: number;
  name: string;
  slug: string;
  category: string | null;
  displayOrder: number;
  seriesCount: number;
  offerCount: number;
};

const columns: AdminColumn<SportRow>[] = [
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
  { key: 'category', label: 'Category', sortable: true, sortAccessor: (s) => s.category, cell: (s) => s.category ?? <span className="text-muted-foreground">—</span> },
  { key: 'order', label: 'Order', sortable: true, sortAccessor: (s) => s.displayOrder, cell: (s) => s.displayOrder, className: 'text-right tabular-nums' },
  { key: 'series', label: 'Events', sortable: true, sortAccessor: (s) => s.seriesCount, cell: (s) => s.seriesCount, className: 'text-right tabular-nums' },
  { key: 'offers', label: 'Active offers', sortable: true, sortAccessor: (s) => s.offerCount, cell: (s) => s.offerCount, className: 'text-right tabular-nums' },
];

export function SportsTable({ rows }: { rows: SportRow[] }) {
  return (
    <AdminTable
      rows={rows}
      columns={columns}
      searchFields={['name', 'slug']}
      rowHref={(s) => `/admin/sports/${s.id}/edit`}
      defaultSort={{ key: 'order', direction: 'asc' }}
      searchPlaceholder="Search sports…"
      emptyState="No sports match."
    />
  );
}
