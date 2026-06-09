'use client';

import { Badge } from '@/components/ui/badge';
import { AdminTable, type AdminColumn } from '@/components/admin/AdminTable';

const yes = (v: boolean) => (v ? <span className="font-medium text-primary">Yes</span> : <span className="text-muted-foreground">—</span>);

export type AuthorRow = {
  id: string;
  name: string;
  slug: string;
  title: string | null;
  isActive: boolean;
  avatarUrl: string | null;
  fullBio: string | null;
  yearsExperience: number | null;
  socialCount: number;
  brandCount: number;
  articleCount: number;
};

const columns: AdminColumn<AuthorRow>[] = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    sortAccessor: (a) => a.name,
    cell: (a) => (
      <>
        <span className="font-medium">{a.name}</span>
        <span className="block text-xs text-muted-foreground">/authors/{a.slug}</span>
      </>
    ),
  },
  { key: 'title', label: 'Title', sortable: true, sortAccessor: (a) => a.title, cell: (a) => a.title ?? <span className="text-muted-foreground">—</span> },
  { key: 'avatar', label: 'Avatar', cell: (a) => yes(Boolean(a.avatarUrl)) },
  { key: 'fullBio', label: 'Full bio', cell: (a) => yes(Boolean(a.fullBio)) },
  { key: 'socials', label: 'Socials', sortable: true, sortAccessor: (a) => a.socialCount, cell: (a) => a.socialCount, className: 'text-right tabular-nums' },
  { key: 'since', label: 'Since', sortable: true, sortAccessor: (a) => a.yearsExperience, cell: (a) => a.yearsExperience ?? '—', className: 'text-right tabular-nums text-muted-foreground' },
  { key: 'status', label: 'Status', sortable: true, sortAccessor: (a) => a.isActive, cell: (a) => <Badge variant={a.isActive ? 'default' : 'destructive'}>{a.isActive ? 'Active' : 'Inactive'}</Badge> },
  { key: 'brands', label: 'Brands', sortable: true, sortAccessor: (a) => a.brandCount, cell: (a) => a.brandCount, className: 'text-right tabular-nums' },
  { key: 'articles', label: 'Articles', sortable: true, sortAccessor: (a) => a.articleCount, cell: (a) => a.articleCount, className: 'text-right tabular-nums' },
];

export function AuthorsTable({ rows }: { rows: AuthorRow[] }) {
  return (
    <AdminTable
      rows={rows}
      columns={columns}
      searchFields={['name', 'slug']}
      rowHref={(a) => `/admin/authors/${a.id}/edit`}
      defaultSort={{ key: 'name', direction: 'asc' }}
      searchPlaceholder="Search authors…"
      emptyState="No authors match."
    />
  );
}
