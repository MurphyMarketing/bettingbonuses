'use client';

import { Badge } from '@/components/ui/badge';
import { AdminTable, type AdminColumn, type AdminStatusFilter } from '@/components/admin/AdminTable';

export type RedirectRow = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  isActive: boolean;
};

const columns: AdminColumn<RedirectRow>[] = [
  { key: 'from', label: 'From', sortable: true, sortAccessor: (r) => r.fromPath, cell: (r) => <span className="font-mono text-sm font-medium">{r.fromPath}</span> },
  { key: 'to', label: 'To', sortable: true, sortAccessor: (r) => r.toPath, cell: (r) => <span className="font-mono text-sm text-muted-foreground">{r.toPath}</span> },
  { key: 'code', label: 'Code', sortable: true, sortAccessor: (r) => r.statusCode, cell: (r) => r.statusCode, className: 'tabular-nums' },
  { key: 'status', label: 'Status', sortable: true, sortAccessor: (r) => r.isActive, cell: (r) => <Badge variant={r.isActive ? 'default' : 'destructive'}>{r.isActive ? 'Active' : 'Inactive'}</Badge> },
];

const statusFilters: AdminStatusFilter<RedirectRow>[] = [
  { key: 'active', label: 'Active', predicate: (r) => r.isActive },
  { key: 'inactive', label: 'Inactive', predicate: (r) => !r.isActive },
];

export function RedirectsTable({ rows }: { rows: RedirectRow[] }) {
  return (
    <AdminTable
      rows={rows}
      columns={columns}
      searchFields={['fromPath', 'toPath']}
      statusFilters={statusFilters}
      rowHref={(r) => `/admin/redirects/${r.id}/edit`}
      defaultSort={{ key: 'from', direction: 'asc' }}
      searchPlaceholder="Search redirects…"
      emptyState="No redirects match."
    />
  );
}
