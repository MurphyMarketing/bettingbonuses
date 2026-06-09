'use client';

import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable';

const yes = (v: boolean) => (v ? <span className="font-medium text-primary">Yes</span> : <span className="text-muted-foreground">—</span>);

export type StateRow = {
  name: string;
  slug: string;
  code: string;
  intro: string | null;
  regulatorUrl: string | null;
  hotline: string | null;
  legalStatus: string | null;
  brandCount: number;
};

const columns: AdminColumn<StateRow>[] = [
  {
    key: 'name',
    label: 'State',
    sortable: true,
    sortAccessor: (s) => s.name,
    cell: (s) => (
      <>
        <span className="font-medium">{s.name}</span>
        <span className="ml-1 text-xs text-muted-foreground">({s.code})</span>
      </>
    ),
  },
  { key: 'intro', label: 'Intro', cell: (s) => yes(Boolean(s.intro)) },
  { key: 'regulatorUrl', label: 'Regulator URL', cell: (s) => yes(Boolean(s.regulatorUrl)) },
  { key: 'hotline', label: 'Hotline', cell: (s) => yes(Boolean(s.hotline)) },
  { key: 'legalStatus', label: 'Legal status', sortable: true, sortAccessor: (s) => s.legalStatus, cell: (s) => <span className="text-sm text-muted-foreground">{s.legalStatus ?? '—'}</span> },
  { key: 'brands', label: 'Brands', sortable: true, sortAccessor: (s) => s.brandCount, cell: (s) => s.brandCount, className: 'text-right tabular-nums' },
];

export function StatesTable({ rows }: { rows: StateRow[] }) {
  return (
    <AdminTable
      rows={rows}
      columns={columns}
      searchFields={['name', 'code']}
      rowHref={(s) => `/admin/states/${s.slug}`}
      defaultSort={{ key: 'name', direction: 'asc' }}
      searchPlaceholder="Search states…"
      emptyState="No states match."
    />
  );
}
